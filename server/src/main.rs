mod action;
mod server;
mod user;
mod world;

use server::{Connection, Server, ServerEvent};
use std::{env, thread};

fn main() {
	let addr = env::args()
		.skip(1)
		.next()
		.unwrap_or_else(|| "127.0.0.1:3012".to_string());
	println!("Listening on: {addr:?}");
	let mut server = Server::new();
	let tx = server.tx();

	thread::spawn(move || {
		eprintln!("Server thread started");
		server.run();
		eprintln!("Server thread died");
	});

	ws::listen(addr, |sender| {
		tx.send(ServerEvent::Connection(sender.clone())).unwrap();

		Connection {
			sender: sender.clone(),
			tx: tx.clone(),
		}
	})
	.unwrap();
}
