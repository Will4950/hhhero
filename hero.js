/* eslint-disable-next-line no-unused-vars */
import dotenv from 'dotenv/config';

import ora from 'ora';
import prompts from 'prompts';
import asTable from 'as-table';

import {
	printHeader,
	log,
	advLog,
	rainbow,
	delay,
	rose,
	spearmint,
	goldenrod,
	bloom,
	bold,
	underline
} from './utils.js';
import {ZoomAPI} from './zoom.js';

import {readFile} from 'node:fs/promises';

export class HHH {
	constructor() {
		this.zoom = new ZoomAPI();
	}

	async start() {
		try {
			printHeader();
			log(`${rainbow('Starting up...')}\n`);
			await this.loadHours();
			if (this.hours === false)
				await this.stop('Error loading hours from ./hours.json', 404);
			await delay(1000);
			await this.connectZoom();
			await this.getZoomData();
			await delay(1000);
			this.showMainMenu();
		} catch (e) {
			await this.stop(e.message, 1003);
		}
	}

	async stop(error = null, num = 1001) {
		if (error) {
			log(`\n❌ ${rose(`[${num}] Error:`)} ${error}\n`);
			process.exit(num);
		} else {
			printHeader();
			log(`${spearmint('Shutting down...')}\n`);
			log(`\nHave a great day!\n`);
			process.exit(0);
		}
	}

	async loadHours() {
		const spinner = ora({
			text: `Loading hours.json`
		}).start();
		try {
			const json = await JSON.parse(
				await readFile('./hours.json', {encoding: 'utf8'})
			);
			this.holidays = json.holidays || [];
			this.hours = [['Name', 'From', 'To']];
			for (const i in this.holidays) {
				this.hours.push([
					this.holidays[i][0],
					this.holidays[i][1],
					this.holidays[i][2]
				]);
			}
			spinner.succeed();
		} catch (e) {
			spinner.fail();
			this.hours = false;
		}
	}

	async connectZoom() {
		const spinner = ora({
			text: `Checking Zoom Access Token`
		}).start();
		try {
			await this.zoom.init();
			spinner.succeed();
		} catch (e) {
			spinner.fail();
			await this.stop('Error with the Access Token.', 500);
		}
	}

	async getZoomData() {
		const spinner = ora({
			text: `Grabbing Zoom account information\n`
		}).start();
		try {
			await this.zoom.getPhoneData();
			spinner.succeed();
		} catch (e) {
			spinner.fail();
			await this.stop(e.message, 1001);
		}
	}

	printZoomData() {
		log(
			`${asTable([
				[`${underline(`${bold(`${bloom('Zoom')} Account Details`)}`)}`],
				[`Phone ${spearmint('sites')}:`, this.zoom.sites.length],
				['Auto Receptionists:', this.zoom.auto_receptionists.length],
				[
					`${rose('Ext')} Auto Receptionists:`,
					this.zoom.external_auto_receptionists.length
				],
				['Call queues:', this.zoom.call_queues.length],
				[`${rose('Ext')} Call queues:`, this.zoom.external_call_queues.length]
			])}\n`
		);
	}

	async showMainMenu() {
		printHeader();
		this.printZoomData();

		const mainMenu = await prompts({
			type: 'select',
			name: 'menu',
			message: `${goldenrod('Main Menu:')} Choose an option`,
			choices: [
				{
					title: `Display holiday hours configuration`,
					value: 'hours'
				},
				{
					title: `Update Auto Receptionists`,
					value: 'ars'
				},
				{
					title: `Update Call Queues`,
					value: 'cqs'
				},
				{
					title: `Update All and Quit`,
					value: 'all'
				},
				{
					title: `Advanced Operations Menu`,
					value: 'aom'
				},
				{
					title: `Exit ${rose('H.H.H.')}`,
					value: 'end'
				}
			]
		});

		switch (mainMenu.menu) {
			case 'hours':
				printHeader();
				await this.loadHours();
				log(`\n\nHoliday Hours:\n`);
				log(`${asTable(this.hours)}`);
				log('\nContinuing in 10 seconds.\n');
				await delay(10000);
				await this.showMainMenu();
				break;
			case 'aom':
				await this.showAdvancedMenu();
				break;
			case 'ars':
				await this.zoom.updateHolidayHours(
					this.zoom.external_auto_receptionists,
					this.hours,
					'Updating Auto Receptionists'
				);
				await this.showMainMenu();
				break;
			case 'cqs':
				await this.zoom.updateHolidayHours(
					this.zoom.external_call_queues,
					this.hours,
					'Updating Call Queues'
				);
				await this.showMainMenu();
				break;
			case 'all':
				await this.zoom.updateHolidayHours(
					this.zoom.external_auto_receptionists,
					this.hours,
					'Updating Auto Receptionists'
				);
				await this.getZoomData();
				await this.zoom.updateHolidayHours(
					this.zoom.external_call_queues,
					this.hours,
					'Updating Call Queues'
				);
			default:
				await this.stop();
		}
	}

	async showAdvancedMenu() {
		printHeader();

		const advancedMenu = await prompts({
			type: 'select',
			name: 'advmenu',
			message: `${goldenrod('Advanced:')}`,
			choices: [
				{
					title: `Refresh Zoom account information`,
					value: 'zai'
				},
				{
					title: `Print test auto receptionist object`,
					value: 'ar'
				},
				{
					title: `Print test call queue object`,
					value: 'cq'
				},
				{
					title: `${rose('REMOVE')} All Holiday Hours`,
					value: 'rm'
				},
				{
					title: `Go Back`,
					value: 'end'
				}
			]
		});

		switch (advancedMenu.advmenu) {
			case 'ar':
				await advLog(this.zoom.external_auto_receptionists[0]);
				break;
			case 'cq':
				await advLog(this.zoom.external_call_queues[0]);
				break;
			case 'rm':
				await this.zoom.removeAllHoldays();
			case 'zai':
				await this.getZoomData();
		}

		await this.showMainMenu();
	}
}
