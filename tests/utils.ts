import {State, Transition} from '../';
import sinon = require('sinon');

export interface TestSession {
}

export class Resolver extends State<TestSession> {
	public onEntrySpy:sinon.SinonSpy;
	constructor(name:string, public transition = ``, public value = null) {
		super(name);
		this.onEntrySpy = sinon.spy(this, `onEntry`);
	}
	onEntry() {
		return Promise.resolve([this.transition, this.value] as Transition);
	}
}

export class Rejecter extends State<TestSession> {
	public onEntrySpy:sinon.SinonSpy;
	constructor(name:string, public err) {
		super(name);
		this.onEntrySpy = sinon.spy(this, `onEntry`);
	}
	onEntry() {
		return Promise.reject(this.err);
	}
}