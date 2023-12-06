import axios from 'axios';
import _ from 'underscore';
import ora from 'ora';
import {delay} from './utils.js';

const AUTH = 'https://zoom.us/oauth';
const API = 'https://api.zoom.us/v2';

export class ZoomAPI {
	constructor() {}

	async init() {
		await this.getAccessToken();
	}

	async getPhoneData() {
		this.sites = [];
		this.auto_receptionists = [];
		this.external_auto_receptionists = [];
		this.call_queues = [];
		this.external_call_queues = [];

		await this.getPhoneSites();
		await this.getCallQueues();
		await this.getAutoReceptionists();

		for (const i in this.call_queues) {
			if (this.call_queues[i].phone_numbers)
				this.external_call_queues = this.external_call_queues.concat(
					this.call_queues[i]
				);
		}

		for (const i in this.auto_receptionists) {
			if (this.auto_receptionists[i].phone_numbers)
				this.external_auto_receptionists =
					this.external_auto_receptionists.concat(this.auto_receptionists[i]);
		}
	}

	async getAccessToken() {
		let oauthToken = Buffer.from(
			`${process.env.clientID}:${process.env.clientSecret}`
		).toString('base64');

		let res = await axios({
			method: 'post',
			url: `${AUTH}/token?grant_type=account_credentials&account_id=${process.env.accountID}`,
			headers: {Authorization: `Basic ${oauthToken}`}
		});

		this.access_token = res.data.access_token;
		this.header = {
			Authorization: `Bearer ${res.data.access_token}`,
			'Content-Type': 'application/json'
		};
	}

	async getPhoneSites(token) {
		let res = await axios({
			method: 'get',
			url: `${API}/phone/sites`,
			headers: this.header,
			params: {
				page_size: 300,
				next_page_token: token ? token : null
			}
		});

		this.sites = this.sites.concat(res.data.sites);
		if (res.data.next_page_token) {
			return await this.getPhoneSites(res.data.next_page_token);
		} else {
			return this.sites;
		}
	}

	async getAutoReceptionists(token) {
		let res = await axios({
			method: 'get',
			url: `${API}/phone/auto_receptionists`,
			headers: this.header,
			params: {
				page_size: 300,
				next_page_token: token ? token : null
			}
		});

		this.auto_receptionists = this.auto_receptionists.concat(
			res.data.auto_receptionists
		);

		if (res.data.next_page_token) {
			return await this.getAutoReceptionists(res.data.next_page_token);
		} else {
			return this.auto_receptionists;
		}
	}

	async getCallQueues(token) {
		let res = await axios({
			method: 'get',
			url: `${API}/phone/call_queues`,
			headers: this.header,
			params: {
				page_size: 300,
				next_page_token: token ? token : null
			}
		});

		this.call_queues = this.call_queues.concat(res.data.call_queues);
		if (res.data.next_page_token) {
			return await this.getCallQueues(res.data.next_page_token);
		} else {
			for (const i in this.call_queues) {
				let data = await this.getHolidays(this.call_queues[i].extension_id);
				if (data.holiday_hours.length > 0) {
					let new_hours = [];
					for (const j in data.holiday_hours) {
						const obj = new Object();
						obj.id = data.holiday_hours[j].holiday_id;
						for (const k in data.holiday_hours[j].details) {
							if (
								data.holiday_hours[j].details[k].sub_setting_type === 'holiday'
							) {
								obj.name = data.holiday_hours[j].details[k].settings.name;
								obj.from = data.holiday_hours[j].details[k].settings.from;
								obj.to = data.holiday_hours[j].details[k].settings.to;
							}
						}

						new_hours.push({...obj});
					}
					this.call_queues[i].holiday_hours = new_hours;
				}
			}
			return this.call_queues;
		}
	}

	async getHolidays(extensionId) {
		let res = await axios({
			method: 'get',
			url: `${API}/phone/extension/${extensionId}/call_handling/settings`,
			headers: this.header
		});
		return res.data;
	}

	async updateHolidayHours(list, hours, title) {
		const spinner = ora({
			text: `${title}`
		}).start();

		hours.shift();

		for (const i in list) {
			if (process.env.TESTING === 'true' && i > 0) break;
			spinner.text = `${title} ${parseInt(i) + 1} / ${list.length}`;
			for (const j in list[i].holiday_hours) {
				const search = [
					list[i].holiday_hours[j].name,
					list[i].holiday_hours[j].from,
					list[i].holiday_hours[j].to
				];

				const no_update_needed = hours.some(function (arr) {
					return arr.every(function (prop, index) {
						return search[index] === prop;
					});
				});

				if (!no_update_needed) {
					const sruoh = _.unzip(hours);
					const k = _.indexOf(sruoh[0], search[0]);
					const holiday_id = list[i].holiday_hours[j].id;
					const extension_id = list[i].extension_id;

					if (k === -1) {
						await this.deleteHoliday(extension_id, holiday_id);
					} else {
						await this.updateHoliday(
							extension_id,
							holiday_id,
							sruoh[1][k],
							sruoh[2][k]
						);
					}
					await delay(50);
				}
			}

			for (const j in hours) {
				let no_add;
				if (typeof list[i].holiday_hours === 'undefined') {
					no_add = false;
				} else {
					no_add = list[i].holiday_hours.find((x) => x.name === hours[j][0]);
				}

				if (!no_add) {
					const extension_id = list[i].extension_id;
					await this.addHoliday(
						extension_id,
						hours[j][0],
						hours[j][1],
						hours[j][2]
					);
					await delay(50);
				}
			}

			await delay(100);
		}
		spinner.succeed();
		console.log('\nUpdate complete.  Continuing in 5 seconds.\n');
		await delay(5000);
	}

	async removeAllHoldays() {
		const title = `Removing all holidays from ARs and CQs`;
		let list = [];
		list = list.concat(
			this.external_auto_receptionists,
			this.external_call_queues
		);
		const spinner = ora({
			text: `${title}`
		}).start();
		for (const i in list) {
			spinner.text = `${title} ${parseInt(i) + 1} / ${list.length}`;
			for (const j in list[i].holiday_hours) {
				const holiday_id = list[i].holiday_hours[j].id;
				const extension_id = list[i].extension_id;
				await this.deleteHoliday(extension_id, holiday_id);
			}
		}
		spinner.succeed();
		console.log('\nUpdate complete.  Continuing in 5 seconds.\n');
		await delay(5000);
	}

	async deleteHoliday(extensionId, holiday_id) {
		await axios({
			method: 'delete',
			url: `${API}/phone/extension/${extensionId}/call_handling/settings/holiday_hours`,
			headers: this.header,
			params: {
				holiday_id
			}
		});
	}

	async updateHoliday(extensionId, holiday_id, from, to) {
		await axios({
			method: 'patch',
			url: `${API}/phone/extension/${extensionId}/call_handling/settings/holiday_hours`,
			headers: this.header,
			data: {
				settings: {
					holiday_id,
					from,
					to
				},
				sub_setting_type: 'holiday'
			}
		});
	}

	async addHoliday(extensionId, name, from, to) {
		await axios({
			method: 'post',
			url: `${API}/phone/extension/${extensionId}/call_handling/settings/holiday_hours`,
			headers: this.header,
			data: {
				settings: {
					name,
					from,
					to
				},
				sub_setting_type: 'holiday'
			}
		});
	}
}
