import { Engine, Debug } from './Bunas';

Engine.init();
Engine.load({}, start);

function start() {
	Debug.log('Bunas is Running!');
}