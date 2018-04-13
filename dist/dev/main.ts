import { Engine as Eng, Debug } from './Bunas';

Eng.init();
Eng.load({}, start);

function start() {
    Debug.toggle();
    Debug.log('Bunas is running...');
}