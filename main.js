#!/usr/bin/env node
import {HHH} from './hero.js';

const hero = new HHH();

try {
	await hero.start();
} catch (e) {
	await hero.stop(e, 1000);
}
