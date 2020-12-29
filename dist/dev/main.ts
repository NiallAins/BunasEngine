import { Engine, Debug } from 'Bunas';

Engine.init(start);
Debug.toggle();

function start() {
	Debug.log('Bunas is working!');
}