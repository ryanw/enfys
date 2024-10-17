#[derive(Clone, Debug)]
pub struct User {
	pub connection: ws::Sender,
	pub name: String,
	pub position: [f32; 3],
	pub velocity: [f32; 3],
	pub rotation: [f32; 3],
}
