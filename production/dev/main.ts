import { Engine as Eng, Physics as Phy, Input } from './Bunas';

Eng.init()
Eng.load({}, initGameLoop);

function initGameLoop() {
    for(let i = 0; i < 1000; i++) {
        let p =new Phy.Particle(
            10 * Math.random(),
            10 * Math.random(),
            4 + (10 * Math.random()),
            10
        );
        p.startStep = function() {
            if (this.p.x > Eng.cW + 50) { this.p.x = -48 }
            if (this.p.x < -48) { this.p.x = Eng.cW + 50 }
            if (this.p.y > Eng.cH + 50) { this.p.y = -48 }
            if (this.p.y < -48) { this.p.y = Eng.cH + 50 }

            let m  = new Phy.Vec(Input.mouse.x, Input.mouse.y);
            let mf = 2;
            if (Input.mouse.right.pressed) {
                mf = -30;
            } else if (Input.mouse.left.down) {
                mf = 1000;
            }
            this.f = this.f.add(new Phy.Vec(mf / this.p.dis(m), this.p.angWith(m) + Math.PI, true));
        }
        p.applyForce(
            new Phy.Vec(
                20 * Math.random(),
                Math.PI * 2 * Math.random(),
                true
            )
        );
    }
}