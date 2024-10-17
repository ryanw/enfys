use anyhow::Result;
use std::{error::Error, fmt, io::Read};

#[derive(Debug)]
pub enum MessageActions {
	Noop,
	Login,
	Logout,
	Move,
	Join,
	Leave,
	Invalid,
}

impl From<u8> for MessageActions {
	fn from(value: u8) -> Self {
		match value {
			0 => Self::Noop,
			1 => Self::Login,
			2 => Self::Logout,
			3 => Self::Move,
			4 => Self::Join,
			5 => Self::Leave,
			_ => Self::Invalid,
		}
	}
}

#[derive(Debug, Clone, PartialEq)]
pub enum UserAction {
	Noop,
	Login {
		name: String,
		seed: u32,
	},
	Move {
		position: [f32; 3],
		velocity: [f32; 3],
		rotation: [f32; 3],
	},
}

#[derive(Debug, Clone)]
pub enum ServerAction {
	Join {
		id: u32,
		name: String,
	},
	Leave {
		id: u32,
	},
	Move {
		id: u32,
		position: [f32; 3],
		velocity: [f32; 3],
		rotation: [f32; 3],
	},
}
impl ServerAction {
	pub fn encode(&self) -> Result<Vec<u8>> {
		match self {
			ServerAction::Move {
				id,
				position,
				velocity,
				rotation,
			} => {
				let mut bytes = Vec::with_capacity((2 + 3 + 3 + 3) * 4);
				bytes.push(MessageActions::Move as u8);
				bytes.extend([0; 3]);
				bytes.extend(id.to_le_bytes());
				for f in position {
					bytes.extend(f.to_le_bytes());
				}
				for f in velocity {
					bytes.extend(f.to_le_bytes());
				}
				for f in rotation {
					bytes.extend(f.to_le_bytes());
				}

				Ok(bytes)
			}
			ServerAction::Join { id, name } => {
				let mut bytes = Vec::with_capacity(8 + name.bytes().len());
				bytes.push(MessageActions::Join as u8);
				bytes.extend([0; 3]);
				bytes.extend(id.to_le_bytes());
				bytes.extend(name.bytes());
				Ok(bytes)
			}
			ServerAction::Leave { id } => {
				let mut bytes = Vec::with_capacity(8);
				bytes.push(MessageActions::Leave as u8);
				bytes.extend([0; 3]);
				bytes.extend(id.to_le_bytes());
				Ok(bytes)
			}
		}
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

#[derive(Debug)]
pub enum DecodeError {
	InvalidData,
}
impl Error for DecodeError {}

impl fmt::Display for DecodeError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			DecodeError::InvalidData => write!(f, "Invalid Data"),
		}
	}
}

impl TryFrom<&Vec<u8>> for UserAction {
	type Error = DecodeError;
	fn try_from(data: &Vec<u8>) -> Result<Self, Self::Error> {
		Self::try_from(data.as_slice())
	}
}

impl TryFrom<&[u8]> for UserAction {
	type Error = DecodeError;

	fn try_from(data: &[u8]) -> Result<Self, Self::Error> {
		match data[0].into() {
			MessageActions::Noop => Ok(UserAction::Noop),
			MessageActions::Login => {
				if data.len() < 5 {
					eprintln!("Invalid message length: {data:?} -- {:?}", data.len());
					return Err(DecodeError::InvalidData);
				}
				let seed = u32::from_le_bytes([data[4], data[5], data[6], data[7]]);
				let name = String::from_utf8(data[8..].to_vec()).unwrap_or_default();
				Ok(UserAction::Login { name, seed })
			}
			MessageActions::Move => {
				if data.len() != 44 {
					eprintln!("Invalid message length: {data:?} -- {:?}", data.len());
					return Err(DecodeError::InvalidData);
				}
				let mut bytes = data[8..].bytes();
				let mut next_byte = || bytes.next().unwrap().unwrap_or_default();
				let mut next_float =
					|| f32::from_le_bytes([next_byte(), next_byte(), next_byte(), next_byte()]);
				// FIXME remove this
				let id = u32::from_le_bytes([data[4], data[5], data[6], data[7]]);
				Ok(UserAction::Move {
					position: [next_float(), next_float(), next_float()],
					velocity: [next_float(), next_float(), next_float()],
					rotation: [next_float(), next_float(), next_float()],
				})
			}
			MessageActions::Logout => {
				// FIXME implement something
				Ok(UserAction::Noop)
			}
			MessageActions::Join | MessageActions::Leave | MessageActions::Invalid => {
				Err(DecodeError::InvalidData)
			}
		}
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
			b"\x04\x00\x00\x00\x78\x56\x34\x12\x42\x69\x6C\x6C\x20\x50\x72\x65\x73\x74\x6F\x6E"
		);
	}

	#[test]
	fn encodes_leave_server_action() {
		let action = ServerAction::Leave { id: 0x12345678 };
		let bytes = action.encode().expect("Failed to encode action");
		assert_eq!(bytes, b"\x05\x00\x00\x00\x78\x56\x34\x12");
	}

	#[test]
	fn encodes_move_server_action() {
		let mut expected_bytes: Vec<u8> = vec![
			0x03, 0x00, 0x00, 0x00, // Action enum
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

		let action = ServerAction::Move {
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
		let bytes: &[u8] = b"\x00";
		let action = UserAction::try_from(bytes).unwrap();
		assert_eq!(action, UserAction::Noop);
	}

	#[test]
	fn decodes_login_user_action() {
		let bytes: &[u8] = b"\x01\x00\x00\x00\xAB\xCD\xEF\x82Ted Logan";
		let action = UserAction::try_from(bytes).unwrap();
		match action {
			UserAction::Login { name, seed } => {
				assert_eq!(name, "Ted Logan");
				assert_eq!(seed, 0x82efcdab);
			}
			_ => panic!("Wrong user action"),
		}
	}

	#[test]
	fn decodes_move_user_action() {
		let mut bytes: Vec<u8> = vec![
			0x03, 0x00, 0x00, 0x00, // Action enum
			0x12, 0x34, 0x56, 0x78, // Player ID FIXME remove this
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
		let action = UserAction::try_from(&bytes).expect("Failed to decode action");
		match action {
			UserAction::Move {
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
