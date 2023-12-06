import figlet from 'figlet';
import chalk from 'chalk';

export function bold(text) {
	return chalk.bold(text);
}
export function underline(text) {
	return chalk.underline(text);
}

export const bloom = chalk.hex('#0B5CFF');
export const spearmint = chalk.hex('#00FF91');
export const rose = chalk.hex('#FF0055');
export const agave = chalk.hex('#00F0EA');
export const lavendar = chalk.hex('#9D5BD3');
export const goldenrod = chalk.hex('#FFCD00');
export const saffron = chalk.hex('#FF7A00');
export const midnight = chalk.hex('#00053D');
export const polarnight = chalk.hex('#00031F');

export function rainbow(str) {
	const letters = str.split('');
	const colors = [
		'#FF0055',
		'#FFCD00',
		'#00FF91',
		'#00F0EA',
		'#0B5CFF',
		'#9D5BD3'
	];
	const colorsCount = colors.length;

	return letters
		.map((l, i) => {
			const color = colors[i % colorsCount];
			return chalk.hex(color)(l);
		})
		.join('');
}

export function log(message) {
	console.log(message);
}

export async function advLog(obj) {
	console.clear();
	console.log(
		`HHH ADV OUTPUT:\n\n\n\n\n\n\n\n\n${JSON.stringify(obj, null, 2)}`
	);
	await delay(10000);
}

export async function delay(ms = 300) {
	return await new Promise((r) => setTimeout(r, ms));
}

export function printHeader() {
	console.clear();
	console.log(rainbow(figlet.textSync(' H. H. H.', 'Big')));
	console.log(bold(`🦸 ${rose('H')}oliday ${rose('H')}our ${rose('H')}ero\n`));
	if (process.env.TESTING === 'true') {
		log(`${bold(`${goldenrod('!!!  TESTING MODE ENABLED  !!!\n')}`)}`);
	}
}
