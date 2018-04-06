import {State, Transition, Thread} from '../';
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

export class ExtPromise extends State<TestSession> {
	public resolve: Function;
	public reject: Function;
	public onEntrySpy:sinon.SinonSpy;
	public cancelSpy:sinon.SinonSpy;
	constructor(name:string) {
		super(name);
		this.onEntrySpy = sinon.spy(this, `onEntry`);
		this.cancelSpy = sinon.spy();
	}
	onEntry(session:any, thread:Thread) {
		return thread.wrap(new Promise<Transition>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		}), this.cancelSpy);
	}
}