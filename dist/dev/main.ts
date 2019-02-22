import { Engine, Debug } from './Bunas';

Engine.init(start);

function start():void {
	Debug.toggle(true);
	Debug.log('Bunas is Running!');
}