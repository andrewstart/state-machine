import {StateMachine, State, ERROR_PREFIX} from '../';
import {Resolver} from './utils';
import assert = require('assert');

describe(`State Machine Creation`, function() {
	it(`Can instantiate StateMachine`, function() {
		const sm = new StateMachine();
		assert.equal(typeof sm.run, `function`, `StateMachine.run should be a function`);
	});
	
	it(`Can create and destroy State`, function() {
		const sm = new State(`test`);
		sm.destroy();
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
	
	it(`Can't duplicate transitions on states`, function() {
		assert.throws(function() {
			const sm = new StateMachine();
			const first = new Resolver(`First state`);
			const second = new Resolver(`Second state`);
			sm.addTransition(``, first, second);
			const bad = new Resolver(`Also second state`);
			sm.addTransition(``, first, bad);
		}, `Should throw an error if a duplicate transition is added`);
	});
	
	it(`Can't duplicate global transitions`, function() {
		assert.throws(function() {
			const sm = new StateMachine();
			const second = new Resolver(`Second state`);
			sm.addTransition(ERROR_PREFIX, null, second);
			const bad = new Resolver(`Also second state`);
			sm.addTransition(ERROR_PREFIX, null, bad);
		}, `Should throw an error if a duplicate global transition is added`);
	});
});