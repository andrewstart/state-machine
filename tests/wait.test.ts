import {StateMachine, Wait} from '../';
import {Resolver, TestSession} from './utils';
import assert = require('assert');
import sinon = require('sinon');

describe.only(`Wait State`, function() {
	beforeEach(function() {
		this.sandbox = sinon.createSandbox({useFakeTimers:true});
	});
	
	afterEach(function() {
		this.sandbox.restore();
	});
	
	it(`Wait resolves after the specified time`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Wait(`First`, 30);
		sm.addTransition(null, null, first);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, first, last);
		sm.addTransition(``, last);
		const result = sm.run({})
		.then((result) => {
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
			assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
		});
		//now tick the clock
		this.sandbox.clock.tick(31);
		return result;
	});
	
	it(`Wait does not resolve or reject before the specified time`, async function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Wait(`First`, 30);
		sm.addTransition(null, null, first);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, first, last);
		sm.addTransition(``, last);
		const result = sm.run({})
		.then((result) => {
			throw new Error('Should not have resolved');
		});
		//now tick the clock
		this.sandbox.clock.tick(28);
		return result;
	});
});