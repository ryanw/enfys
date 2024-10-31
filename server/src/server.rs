use crate::{
	action::{ServerAction, UserAction},
	user::User,
	world::World,
};
use anyhow::{anyhow, Result};
use crossbeam::channel::{self, Receiver, Sender};
use std::{collections::HashMap, net::SocketAddr};

pub type Seed = u32;
pub type ConnectionID = u32;

pub enum ServerEvent {
	Connection(ws::Sender),
	Handshake {
		sender_id: ConnectionID,
		shake: ws::Handshake,
	},
	Disconnection {
		sender_id: ConnectionID,
		code: ws::CloseCode,
		reason: String,
	},
	Action {
		sender_id: ConnectionID,
		action: UserAction,
	},
}

pub struct SocketHandler {
	pub sender: ws::Sender,
	pub tx: Sender<ServerEvent>,
}

impl SocketHandler {
	pub fn process_message(&mut self, data: &[u8]) -> Result<()> {
		let action = UserAction::try_from(data)?;
		self.tx.send(ServerEvent::Action {
			sender_id: self.sender.connection_id(),
			action,
		})?;

		Ok(())
	}
}

impl ws::Handler for SocketHandler {
	fn on_message(&mut self, msg: ws::Message) -> ws::Result<()> {
		match &msg {
			ws::Message::Text(txt) => {
				println!("Ignoring text message: {txt}");
				Ok(())
			}
			ws::Message::Binary(data) => self.process_message(data).map_err(|error| ws::Error {
				kind: ws::ErrorKind::Custom(error.into()),
				details: "Invalid message".into(),
			}),
		}
	}

	fn on_open(&mut self, shake: ws::Handshake) -> ws::Result<()> {
		log::info!(
			"Connection established: {:?} - {:?}",
			(self.sender.connection_id(), self.sender.token()),
			shake.peer_addr
		);
		self.tx
			.send(ServerEvent::Handshake {
				sender_id: self.sender.connection_id(),
				shake,
			})
			.unwrap();

		Ok(())
	}

	fn on_close(&mut self, code: ws::CloseCode, reason: &str) {
		let _ = self.tx.send(ServerEvent::Disconnection {
			sender_id: self.sender.connection_id(),
			code,
			reason: reason.to_owned(),
		});
	}
}

#[derive(Debug)]
pub struct Connection {
	pub sender: ws::Sender,
	pub shake: Option<ws::Handshake>,
}

impl Connection {
	pub fn new(sender: ws::Sender) -> Self {
		Connection {
			sender,
			shake: None,
		}
	}

	pub fn ident(&self) -> String {
		if self.shake.is_some() {
			format!(
				"{}: {} - {:?}",
				self.peer_addr(),
				self.sender.connection_id(),
				self.sender.token()
			)
		} else {
			format!(
				"{} - {:?}",
				self.sender.connection_id(),
				self.sender.token()
			)
		}
	}

	pub fn client_addr(&self) -> String {
		self.shake
			.as_ref()
			.and_then(|shake| shake.request.client_addr().ok().flatten())
			.map(String::from)
			.unwrap_or_else(|| format!("Unknown Client: {}", self.peer_addr()))
	}

	pub fn peer_addr(&self) -> String {
		format!(
			"{}",
			self.shake
				.as_ref()
				.and_then(|s| s.peer_addr)
				.map(|a| a.to_string())
				.unwrap_or_default()
		)
	}
}

pub struct Server {
	pub connections: HashMap<ConnectionID, Connection>,
	pub worlds: HashMap<Seed, World>,
	pub user_worlds: HashMap<ConnectionID, Seed>,
	tx: Sender<ServerEvent>,
	rx: Receiver<ServerEvent>,
}

impl Server {
	pub fn new() -> Self {
		Self::default()
	}

	pub fn tx(&self) -> Sender<ServerEvent> {
		self.tx.clone()
	}

	pub fn send(&self, event: ServerEvent) -> Result<()> {
		self.tx.send(event)?;
		Ok(())
	}

	pub fn run(&mut self) {
		while let Ok(_) = self.process_next_event() {}
	}

	pub fn process_next_event(&mut self) -> Result<()> {
		let event = self.rx.recv()?;
		match event {
			ServerEvent::Connection(conn) => {
				log::debug!("Connect: {:?}", (conn.connection_id(), conn.token()));
				self.connections
					.insert(conn.connection_id(), Connection::new(conn));
			}
			ServerEvent::Handshake { sender_id, shake } => {
				let Some(conn) = self.connections.get_mut(&sender_id) else {
					log::warn!("Couldn't find connection: {sender_id:?}");
					return Ok(());
				};

				log::debug!(
					"Handshake: {sender_id}: {:?} - {:?}",
					conn.client_addr(),
					shake.peer_addr
				);
				conn.shake = Some(shake);
			}
			ServerEvent::Disconnection {
				sender_id,
				reason,
				code,
			} => {
				log::info!("Disconnect: {sender_id} - {code:?} - {reason}");

				let conn = self.connections.remove(&sender_id);
				let Some(seed) = self.user_worlds.remove(&sender_id) else {
					log::error!(
						"Couldn't find seed for: {:?} - {:?}",
						conn.map(|c| c.ident()),
						sender_id
					);
					return Err(anyhow!("Invalid Seed"));
				};

				let mut destroy_world = false;
				if let Some(world) = self.worlds.get_mut(&seed) {
					world.users.remove(&sender_id);
					let _ = world.broadcast(&ServerAction::Leave { id: sender_id }, sender_id);
					// Destroy world when last person leaves
					destroy_world = world.users.len() == 0;
				}
				if destroy_world {
					self.worlds.remove(&seed);
				}
			}
			ServerEvent::Action { sender_id, action } => {
				let identity = self
					.connections
					.get(&sender_id)
					.map(|c| format!("{sender_id}: {}", c.client_addr()))
					.unwrap_or_else(|| format!("{sender_id}: Unknown Connection"));
				match action {
					UserAction::Noop => log::debug!("Noop: {:?}", sender_id),
					UserAction::Login { name, seed } => {
						log::debug!("Login: {:?} - {:?} - {:?}", identity, seed, name);
						let world = self.worlds.entry(seed).or_insert_with(|| World::new(seed));
						let Some(connection) = self.connections.get(&sender_id) else {
							log::error!("Couldn't find connection for sender: {:?}", identity);
							return Err(anyhow!("Invalid Sender ID"));
						};
						let user = User {
							sender: connection.sender.clone(),
							name: name.clone(),
							position: Default::default(),
							velocity: Default::default(),
							rotation: Default::default(),
						};
						self.user_worlds.insert(sender_id, seed);
						log::info!("Created user: {:?} - {:?}", (&identity, seed), user);
						if let Err(error) = world.broadcast(
							&ServerAction::Join {
								id: sender_id,
								name: name.clone(),
							},
							sender_id,
						) {
							log::error!("Error broadcasting message: {identity} {:?}", error);
						}

						for (user_id, other_user) in &world.users {
							let _ = user.sender.send(&ServerAction::Join {
								id: *user_id,
								name: other_user.name.clone(),
							});
							let _ = user.sender.send(&ServerAction::Move {
								id: *user_id,
								position: other_user.position.clone(),
								velocity: other_user.velocity.clone(),
								rotation: other_user.rotation.clone(),
							});
						}
						world.users.insert(sender_id, user);
					}
					UserAction::Logout => {
						log::error!("Logout not implemented");
					}
					UserAction::Move {
						position,
						velocity,
						rotation,
					} => {
						log::debug!(
							"Move: {:?} - {:?}",
							identity,
							(position, velocity, rotation)
						);
						let Some(seed) = self.user_worlds.get_mut(&sender_id) else {
							log::error!("Couldn't find seed for: {:?}", identity);
							return Err(anyhow!("Invalid Sender"));
						};
						let Some(world) = self.worlds.get_mut(&seed) else {
							log::error!("Couldn't find world for: {:?}", identity);
							return Err(anyhow!("Invalid Seed"));
						};
						let Some(user) = world.users.get_mut(&sender_id) else {
							log::error!("Couldn't find user: {:?}", identity);
							return Err(anyhow!("Invalid User ID"));
						};
						user.position = position;
						user.velocity = velocity;
						user.rotation = rotation;
						if let Err(error) = world.broadcast(
							&ServerAction::Move {
								id: sender_id,
								position,
								velocity,
								rotation,
							},
							sender_id,
						) {
							log::error!("Error broadcasting message: {identity} {:?}", error);
						}
					}
				}
			}
		}
		Ok(())
	}
}

impl Default for Server {
	fn default() -> Self {
		let (tx, rx) = channel::unbounded();
		Self {
			connections: HashMap::with_capacity(1024),
			worlds: HashMap::with_capacity(1024),
			user_worlds: HashMap::with_capacity(1024),
			tx,
			rx,
		}
	}
}

#[cfg(test)]
mod test {
	#![allow(deprecated, dead_code)]

	use super::*;
	use std::{
		mem::transmute,
		sync::atomic::{AtomicU32, AtomicUsize, Ordering},
	};

	static NEXT_CONN_ID: AtomicU32 = AtomicU32::new(1111);
	static NEXT_TOKEN: AtomicUsize = AtomicUsize::new(2222);

	#[derive(Debug, Clone)]
	enum FakeSignal {
		Message(ws::Message),
		Connect(url::Url),
	}

	#[derive(Debug, Clone)]
	struct FakeCommand {
		token: mio::Token,
		signal: FakeSignal,
		connection_id: u32,
	}

	#[test]
	fn establishes_connection() {
		let (tx, _) = mio::channel::sync_channel(8);
		let mock_sender = ws::Sender::new(mio::Token(123), tx, 444);

		let mut server = Server::new();
		let tx = server.tx();

		tx.send(ServerEvent::Connection(mock_sender.clone()))
			.expect("Failed to send event");

		assert_eq!(0, server.connections.len());
		server
			.process_next_event()
			.expect("Failed to process event");
		let conn = server.connections.get(&444).unwrap();
		assert_eq!(mock_sender, conn.sender);
	}

	#[test]
	fn logs_in_user_to_correct_world_seed() {
		let mut server = Server::new();
		let (_player, player_rx) = login(&mut server, 0x12345678, "Ted Logan");
		let (other, _other_rx) = login(&mut server, 0x12345678, "Bill Preston");

		let FakeSignal::Message(ws::Message::Binary(bytes)) =
			player_rx.try_recv().expect("No message in channel").signal
		else {
			panic!("Invalid signal");
		};
		let expected_bytes = ServerAction::Join {
			id: other.connection_id(),
			name: "Bill Preston".into(),
		}
		.encode()
		.unwrap();
		assert_eq!(expected_bytes, bytes);
	}

	fn connect(
		server: &mut Server,
		token: usize,
		conn_id: u32,
	) -> (ws::Sender, mio::channel::Receiver<FakeCommand>) {
		let (tx, rx) = mio::channel::sync_channel(8);
		let sender = ws::Sender::new(mio::Token(token), tx.clone(), conn_id);

		server
			.send(ServerEvent::Connection(sender.clone()))
			.expect("Failed to send event");
		server.process_next_event().unwrap();

		(sender, unsafe { transmute(rx) })
	}

	fn login(
		server: &mut Server,
		seed: u32,
		name: &str,
	) -> (ws::Sender, mio::channel::Receiver<FakeCommand>) {
		let token = NEXT_TOKEN.fetch_add(1, Ordering::Relaxed);
		let conn_id = NEXT_CONN_ID.fetch_add(1, Ordering::Relaxed);
		let (sender, rx) = connect(server, token, conn_id);
		server
			.send(ServerEvent::Action {
				sender_id: conn_id,
				action: UserAction::Login {
					seed,
					name: name.to_owned(),
				},
			})
			.expect("Failed to send event");
		server.process_next_event().unwrap();

		(sender, rx)
	}
}
