use anyhow::Result;
use bincode::Options;
use serde::{Deserialize, Serialize};

/// Message sent between server and user or vice versa.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ServerAction {
	Noop,
	Login {
		seed: u32,
		name: String,
	},
	Logout,
	Join {
		id: u32,
		name: String,
	},
	Leave {
		id: u32,
	},
	Transform {
		id: u32,
		position: [f32; 3],
		rotation: [f32; 3],
		velocity: [f32; 3],
	},
	Spawn {
		id: u32,
		position: [f32; 3],
		rotation: [f32; 3],
		velocity: [f32; 3],
		prefab: String,
	},
	Despawn {
		id: u32,
	},
	Damage {
		id: u32,
		position: [f32; 3],
	},
}
impl ServerAction {
	pub fn encode(&self) -> Result<Vec<u8>> {
		Ok(bincode::serialize(self)?)
	}
}

impl From<&ServerAction> for ws::Message {
	fn from(action: &ServerAction) -> Self {
		if let Ok(data) = action.encode() {
			ws::Message::Binary(data)
		} else {
			ws::Message::Binary(vec![])
		}
	}
}

impl TryFrom<&Vec<u8>> for ServerAction {
	type Error = Box<bincode::ErrorKind>;

	fn try_from(data: &Vec<u8>) -> Result<Self, Self::Error> {
		Self::try_from(data.as_slice())
	}
}

impl TryFrom<&[u8]> for ServerAction {
	type Error = Box<bincode::ErrorKind>;

	fn try_from(data: &[u8]) -> Result<Self, Self::Error> {
		// Handling user input, so restrict what they can do
		bincode::DefaultOptions::new()
			.with_fixint_encoding()
			.allow_trailing_bytes()
			.with_limit(1024)
			.deserialize::<Self>(data)
	}
}

#[cfg(test)]
mod test {
	use super::*;

	#[test]
	fn encodes_join_server_action() {
		let action = ServerAction::Join {
			id: 0x12345678,
			name: "Bill Preston".to_string(),
		};
		let bytes = action.encode().expect("Failed to encode action");
		assert_eq!(
			bytes,
			b"\x03\x00\x00\x00\x78\x56\x34\x12\x0c\x00\x00\x00\x00\x00\x00\x00\x42\x69\x6C\x6C\x20\x50\x72\x65\x73\x74\x6F\x6E"
		);
	}

	#[test]
	fn encodes_leave_server_action() {
		let action = ServerAction::Leave { id: 0x12345678 };
		let bytes = action.encode().expect("Failed to encode action");
		assert_eq!(bytes, b"\x04\x00\x00\x00\x78\x56\x34\x12");
	}

	#[test]
	fn encodes_transform_server_action() {
		let mut expected_bytes: Vec<u8> = vec![
			0x05, 0x00, 0x00, 0x00, // Action enum
			0x78, 0x56, 0x34, 0x12, // Player ID
		];
		// Position
		expected_bytes.extend(f32::to_le_bytes(12.34));
		expected_bytes.extend(f32::to_le_bytes(56.78));
		expected_bytes.extend(f32::to_le_bytes(90.12));
		// Velocity
		expected_bytes.extend(f32::to_le_bytes(345.53));
		expected_bytes.extend(f32::to_le_bytes(234.2344));
		expected_bytes.extend(f32::to_le_bytes(5454.444));
		// Rotation
		expected_bytes.extend(f32::to_le_bytes(-0.3));
		expected_bytes.extend(f32::to_le_bytes(0.6));
		expected_bytes.extend(f32::to_le_bytes(1.2));

		let action = ServerAction::Transform {
			id: 0x12345678,
			position: [12.34, 56.78, 90.12],
			velocity: [345.53, 234.2344, 5454.444],
			rotation: [-0.3, 0.6, 1.2],
		};
		let actual_bytes = action.encode().expect("Failed to encode action");

		assert_eq!(expected_bytes, actual_bytes);
	}

	#[test]
	fn decodes_noop_user_action() {
		let bytes: &[u8] = b"\x00\x00\x00\x00";
		let action = ServerAction::try_from(bytes).unwrap();
		assert_eq!(action, ServerAction::Noop);
	}

	#[test]
	fn decodes_login_user_action() {
		let bytes: &[u8] =
			b"\x01\x00\x00\x00\xAB\xCD\xEF\x82\x09\x00\x00\x00\x00\x00\x00\x00Ted Logan";
		let action = ServerAction::try_from(bytes).unwrap();
		match action {
			ServerAction::Login { name, seed } => {
				assert_eq!(name, "Ted Logan");
				assert_eq!(seed, 0x82efcdab);
			}
			_ => panic!("Wrong user action"),
		}
	}

	#[test]
	fn decodes_transform_user_action() {
		let mut bytes: Vec<u8> = vec![
			0x05, 0x00, 0x00, 0x00, // Action enum
			0x01, 0x23, 0x45, 0x67, // ID
		];
		// Position
		bytes.extend(f32::to_le_bytes(12.34));
		bytes.extend(f32::to_le_bytes(55.33));
		bytes.extend(f32::to_le_bytes(765.432));
		// Velocity
		bytes.extend(f32::to_le_bytes(43.11));
		bytes.extend(f32::to_le_bytes(34.654));
		bytes.extend(f32::to_le_bytes(63.123));
		// Rotation
		bytes.extend(f32::to_le_bytes(62.23));
		bytes.extend(f32::to_le_bytes(77.77));
		bytes.extend(f32::to_le_bytes(0.123));

		assert_eq!(bytes.len(), 44);
		let action = ServerAction::try_from(&bytes).expect("Failed to decode action");
		match action {
			ServerAction::Transform {
				id,
				position,
				velocity,
				rotation,
			} => {
				assert_eq!(position, [12.34, 55.33, 765.432]);
				assert_eq!(velocity, [43.11, 34.654, 63.123]);
				assert_eq!(rotation, [62.23, 77.77, 0.123]);
			}
			_ => panic!("Wrong user action"),
		}
	}
}
