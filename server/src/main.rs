mod action;
mod server;
mod user;
mod world;

use server::{SocketHandler, Server, ServerEvent};
use std::{env, thread};

fn main() {
	env_logger::init();

	let addr = env::args()
		.skip(1)
		.next()
		.unwrap_or_else(|| "127.0.0.1:3012".to_string());
	log::info!("Binding to: {addr:?}");
	let mut server = Server::new();
	let tx = server.tx();

	thread::spawn(move || {
		log::info!("Server thread started");
		server.run();
		log::warn!("Server thread died");
	});

	ws::listen(addr, |sender| {
		log::info!("Establishing connection: {:?}", (sender.connection_id(), sender.token()));
		if let Err(error) = tx.send(ServerEvent::Connection(sender.clone())) {
			log::error!("Error sending server connection event: {:?}", error);
		}

		SocketHandler {
			sender: sender.clone(),
			tx: tx.clone(),
		}
	})
	.unwrap();
}
