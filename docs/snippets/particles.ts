let emit1 = new Gph.Emitter(200, 600, [5.6, 6], 10, 0.1);
emit1.setParticle([2, 4], 'dodgerblue', 100);
let emit2 = new Gph.Emitter(Eng.cW - 200, 600, [5.6, 6], 10, 0.1);
emit2.setParticle([2, 4], 'tomato', 100);
Eng.preStep = function() {
    emit1.angle = [(Input.mouse.y / 300) + Math.PI - (Math.PI / 8), (Input.mouse.y / 300) + Math.PI + (Math.PI / 8)];
    emit2.angle = [(-Input.mouse.y / 300) - (Math.PI / 8), (-Input.mouse.y / 300) + (Math.PI / 8)];

    if (Input.mouse.left.pressed) {
        emit1.gravity = 0.5;
        emit2.gravity = 0.5;
    } else {
        emit1.gravity = 0.1;
        emit2.gravity = 0.1;
    }
}