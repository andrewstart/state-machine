import {StateMachine, State, Transition, ERROR_PREFIX} from '../';
import {Rejecter, Resolver, ExtPromise, TestSession} from './utils';
import assert = require('assert');
import sinon = require('sinon');

describe(`Transitions`, function() {
	describe(`Normal`, function() {
		it(`States transition all the way through`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`trans`, first, last);
			sm.addTransition(``, last);
			assert.equal((first as any).transitions.get(`trans`), last, `First state should go to last state`);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
				assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
			});
		});
		
		it(`StateMachine rejects if no transition found`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`notTrans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				throw new Error(`StateMachine should have rejected on run()`);
			}, (err:Transition) => {
				assert.equal(err[0], `${ERROR_PREFIX}TransitionError`, `Rejection transition should be the transition error`);
				assert(err[1] instanceof Error, `Output should be an Error instance`);
			});
		});
		
		it(`States transition using wildcard transition`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(``, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`States transition using specific transition over wildcard transition`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `trans`);
			sm.addTransition(null, null, first);
			const decoy = new Resolver(`Decoy`, `bad`, 0);
			sm.addTransition(``, first, decoy);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(decoy.onEntrySpy.notCalled, `Decoy state should not have been entered`);
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
	});
	
	describe(`Errors`, function() {
		it(`Error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			assert.equal((first as any).transitions.get(`${ERROR_PREFIX}trans`), last, `First state should go to last state`);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
				assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
			});
		});
		
		it(`Less specific error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans.longForm`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Wildcard error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans.longForm`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Specific error transitions are preferred over wildcard errors`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans.longForm`);
			sm.addTransition(null, null, first);
			const decoy = new Resolver(`Decoy`, `bad`, 0);
			sm.addTransition(`${ERROR_PREFIX}`, first, decoy);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(decoy.onEntrySpy.notCalled, `Decoy state should not have been entered`);
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
			});
		});
		
		it(`Rejections with transition data are handled normally`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, [`${ERROR_PREFIX}trans`, `foo`]);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], `foo`, `Second state input should be state output`);
			});
		});
		
		it(`Rejections with transition data with non-error strings are converted to errors`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, [`trans`, `foo`]);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], `foo`, `Second state input should be state output`);
			});
		});
		
		it(`Rejections with error strings are converted to error transitions`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, `${ERROR_PREFIX}trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], null, `Second state input should be null`);
			});
		});
		
		it(`Rejections with non-error strings are converted to error transitions`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, `trans`);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Transition should be the correct error string`);
				assert.equal(last.onEntrySpy.firstCall.args[2], null, `Second state input should be null`);
			});
		});
		
		it(`Rejections with errors are converted to error transitions`, function() {
			const error = new Error(`Test error`);
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, error);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}${error.name}`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}${error.name}`, `Transition should be the correct error string`);
				sinon.assert.match(last.onEntrySpy.firstCall.args[2], {message:`Test error`, name: error.name});
			});
		});
		
		it(`Empty rejections are converted to error transitions`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Rejecter(`First`, undefined);
			sm.addTransition(null, null, first);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(`${ERROR_PREFIX}UnknownError`, first, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(last.onEntrySpy), `First state should have been entered before last state`);
				assert.equal(last.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}UnknownError`, `Transition should be the correct error string`);
				sinon.assert.match(last.onEntrySpy.firstCall.args[2], undefined);
			});
		});
	});
	
	describe(`Global Errors`, function() {
		it(`Global error transitions are taken`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans`);
			sm.addTransition(null, null, first);
			const decoy = new Resolver(`Decoy`, ``);
			sm.addTransition(`trans`, first, decoy);
			const catchState = new Resolver(`Catch`, ``);
			sm.addTransition(`${ERROR_PREFIX}trans`, null, catchState);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(``, decoy, last);
			sm.addTransition(``, catchState, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(decoy.onEntrySpy.notCalled, `Decoy state should not have been entered`);
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(catchState.onEntrySpy.calledOnce, `Catch state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(catchState.onEntrySpy), `First state should have been entered before catch state`);
				assert(catchState.onEntrySpy.calledBefore(last.onEntrySpy), `Catch state should have been entered before last state`);
			});
		});
		
		it(`Specific error transitions are preferred over global error transitions`, function() {
			const sm = new StateMachine<TestSession, number>();
			const first = new Resolver(`First`, `${ERROR_PREFIX}trans`);
			sm.addTransition(null, null, first);
			const middle = new Resolver(`Middle`, ``);
			sm.addTransition(`${ERROR_PREFIX}trans`, first, middle);
			const catchState = new Resolver(`Catch`, ``);
			sm.addTransition(`${ERROR_PREFIX}trans`, null, catchState);
			const last = new Resolver(`Last`, `output`, 42);
			sm.addTransition(``, middle, last);
			sm.addTransition(``, catchState, last);
			sm.addTransition(``, last);
			return sm.run({})
			.then((result) => {
				assert(catchState.onEntrySpy.notCalled, `Decoy state should not have been entered`);
				assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
				assert(middle.onEntrySpy.calledOnce, `Catch state should have been entered`);
				assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
				assert(first.onEntrySpy.calledBefore(middle.onEntrySpy), `First state should have been entered before middle state`);
				assert(middle.onEntrySpy.calledBefore(last.onEntrySpy), `Middle state should have been entered before last state`);
			});
		});
	});
	
	it(`Base State rejects if onEntry not overridden`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new State(`First`);
		sm.addTransition(null, null, first);
		return sm.run({})
		.then((result) => {
			throw new Error(`Should not have resolved`);
		}, (result) => {
			assert.equal(result[0], `${ERROR_PREFIX}DefaultState`, `Should have rejected with '${ERROR_PREFIX}DefaultState' error transition`);
		});
	});
	
	it(`StateMachine rejects if internal error occurs`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, ``);
		sm.addTransition(null, null, first);
		const testError = new Error(`TEST ERROR`);
		(sm as any).findAndRunNextState = () => {throw testError;};
		return sm.run({})
		.then((result) => {
			throw new Error(`Should not have resolved`);
		}, (result) => {
			assert.equal(result[0], `${ERROR_PREFIX}InternalError`, `Should have rejected with '${ERROR_PREFIX}InternalError' error transition`);
			assert.equal(result[1], testError, `Should have rejected with output of the error that was thrown`);
		});
	});
	
	it(`StateMachine throws error if run() is called while running`, function() {
		assert.throws(() => {
			const sm = new StateMachine<TestSession, number>();
			const first = new ExtPromise(`First`);
			sm.addTransition(null, null, first);
			const session = {};
			sm.run(session);
			sm.run(session);
		}, `Should throw an error when running twice`);
	});
});