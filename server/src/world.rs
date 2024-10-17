use crate::action::ServerAction;
use crate::server::{ConnectionID, Seed};
use crate::user::User;
use anyhow::Result;
use std::collections::HashMap;

pub struct World {
	pub seed: Seed,
	pub users: HashMap<ConnectionID, User>,
}

impl World {
	pub fn new(seed: Seed) -> World {
		Self {
			seed,
			users: HashMap::with_capacity(1024),
		}
	}

	pub fn broadcast(&self, action: &ServerAction, sender_id: ConnectionID) -> Result<()> {
		if self.users.len() == 0 {
			return Ok(());
		}
		println!(
			"Broadcasting to {} clients in world {:?}: {action:?}",
			self.users.len() as isize - 1,
			self.seed,
		);
		for User { connection, .. } in self.users.values() {
			if connection.connection_id() == sender_id {
				// Don't send to self
				continue;
			}

			if let Err(error) = connection.send(action) {
				eprintln!(
					"Failed to send to connection: {:?} -- {:?}",
					error, connection
				);
			}
		}
		Ok(())
	}
}
