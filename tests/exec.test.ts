import {StateMachine, Exec, StateMethod, Transition, ERROR_PREFIX, Thread} from '../';
import {Resolver, TestSession} from './utils';
import assert = require('assert');
import sinon = require('sinon');

describe(`Exec State`, function() {
	it(`Can create and destroy`, function() {
		const method:StateMethod<TestSession, any, number> = (session, thread, input, transition) => {
			return Promise.resolve([`exec output`, 3] as Transition<number>);
		};
		const first = new Exec(`First`, method);
		first.destroy();
	});
	
	it(`Exec handles input and output correctly`, function() {
		const method:StateMethod<TestSession, any, number> = sinon.spy((session, thread, input, transition) => {
			return Promise.resolve([`exec output`, 3] as Transition<number>);
		});
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`, 15);
		sm.addTransition(null, null, first);
		const exec = new Exec(`Exec`, method);
		sm.addTransition(``, first, exec);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(`exec output`, exec, last);
		sm.addTransition(``, last);
		const session = {};
		return sm.run(session)
		.then((result) => {
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert((method as sinon.SinonSpy).calledOnce, `Exec method should have been called one time`);
			assert.equal((method as sinon.SinonSpy).getCall(0).args[0], session, `Exec should pass the session object to method`);
			assert((method as sinon.SinonSpy).getCall(0).args[1] instanceof Thread, `Exec should pass the thread object to method`);
			assert.equal((method as sinon.SinonSpy).getCall(0).args[2], 15, `Exec should pass input through to method`);
			assert.equal((method as sinon.SinonSpy).getCall(0).args[3], `trans`, `Exec should pass transition through to method`);
			assert.equal(last.onEntrySpy.getCall(0).args[2], 3, `Exec should use the output returned by the method`);
			assert.equal(last.onEntrySpy.getCall(0).args[3], `exec output`, `Exec should use the output returned by the method`);
		});
	});
	
	it(`Exec does not improperly handle rejections`, function() {
		const method:StateMethod<TestSession, any, number> = sinon.spy((session, thread, input, transition) => {
			return Promise.reject([`execErrWithoutPrefix`, 3] as Transition<number>);
		});
		const sm = new StateMachine<TestSession, number>();
		const first = new Exec(`First`, method);
		sm.addTransition(null, null, first);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(`${ERROR_PREFIX}execErrWithoutPrefix`, first, last);
		sm.addTransition(``, last);
		return sm.run({})
		.then((result) => {
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert((method as sinon.SinonSpy).calledOnce, `Exec method should have been called one time`);
			assert.equal(last.onEntrySpy.getCall(0).args[2], 3, `Exec should use the output returned by the method`);
			assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}execErrWithoutPrefix`, `Exec should use the output returned by the method`);
		});
	});
});