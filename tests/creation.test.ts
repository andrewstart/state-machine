import {StateMachine, State, Transition} from '../';
import assert = require('assert');
import sinon = require('sinon');

interface TestSession {
}

class Resolver extends State<TestSession> {
	public onEntrySpy:sinon.SinonSpy;
	constructor(name:string, public transition = ``, public value = null) {
		super(name);
		this.onEntrySpy = sinon.spy(this, `onEntry`);
	}
	onEntry() {
		return Promise.resolve([this.transition, this.value] as Transition);
	}
}

describe(`State Machine Creation`, function() {
	it(`Can instantiate StateMachine`, function() {
		const sm = new StateMachine();
		assert.equal(typeof sm.run, `function`, `StateMachine.run should be a function`);
	});
	
	it(`Can add first state`, function() {
		const sm = new StateMachine();
		const state = new Resolver(`Test state`);
		sm.addTransition(null, null, state);
		assert.equal((sm as any).firstState, state, `First state is the supplied state`);
	});
	
	it(`Can't add two first states`, function() {
		assert.throws(function() {
			const sm = new StateMachine();
			const first = new Resolver(`First state`);
			sm.addTransition(null, null, first);
			const bad = new Resolver(`Also first state`);
			sm.addTransition(null, null, bad);
		}, `Should throw an error if a second first state is added`);
	});
	
	it(`Can add last state`, function() {
		const sm = new StateMachine();
		const last = new Resolver(`Last`);
		sm.addTransition(``, last);
		assert.equal((last as any).transitions.get(``), null, `Last state transitions to null`);
	});
});