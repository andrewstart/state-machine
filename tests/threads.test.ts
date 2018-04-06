import {StateMachine, BeginThread, EndThread, InterruptThread, RunMode, Wait, ERROR_PREFIX, MAIN_THREAD} from '../';
import {Rejecter, Resolver, ExtPromise, TestSession} from './utils';
import assert = require('assert');

describe(`Parallel Threads`, function() {
	it(`Secondary threads resolves don't complete the machine`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`);
		sm.addTransition(null, null, first);
		const delay = new Wait(`Delay`, 10);
		sm.addTransition(``, first, delay);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(`trans`, delay, last);
		sm.addTransition(``, last);
		
		const threadBegin = new Resolver(`Thread First`);
		sm.addTransition(``, threadBegin);
		sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.onEntrySpy.calledBefore(last.onEntrySpy), `Thread should have been started before last state`);
			assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
			assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
		});
	});
	
	it(`Secondary threads rejections don't complete the machine`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`);
		sm.addTransition(null, null, first);
		const delay = new Wait(`Delay`, 10);
		sm.addTransition(``, first, delay);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(`trans`, delay, last);
		sm.addTransition(``, last);
		
		const threadBegin = new Rejecter(`Thread First`, `!!!`);
		sm.addTransition(``, threadBegin);
		sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.onEntrySpy.calledBefore(last.onEntrySpy), `Thread should have been started before last state`);
			assert.equal(result[0], `output`, `Final out transition should be that returned by the last state`);
			assert.equal(result[1], 42, `Final out value should be that returned by the last state`);
		});
	});
	
	it(`Can start and stop a thread on the same behavior`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`);
		sm.addTransition(null, null, first);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(`trans`, first, last);
		sm.addTransition(``, last);
		
		const threadBegin = new ExtPromise(`Thread First`);
		const threadId = sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		sm.addDecorator(new EndThread(RunMode.END_WITH_STATE, threadId), first);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.cancelSpy.calledOnce, `Thread begin state should have been cancelled`);
		});
	});
	
	it(`Can start and stop a thread on separate behaviors`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`);
		sm.addTransition(null, null, first);
		const mid = new Resolver(`Mid`, ``);
		sm.addTransition(`trans`, first, mid);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, mid, last);
		sm.addTransition(``, last);
		
		const threadBegin = new ExtPromise(`Thread First`);
		const threadId = sm.addDecorator(new BeginThread(RunMode.END_WITH_STATE, threadBegin), first);
		sm.addDecorator(new EndThread(RunMode.START_WITH_STATE, threadId), mid);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.cancelSpy.calledOnce, `Thread begin state should have been cancelled`);
		});
	});
	
	it(`Can interrupt a secondary thread with specific interrupt`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`);
		sm.addTransition(null, null, first);
		const mid = new Resolver(`Mid`, ``);
		sm.addTransition(`trans`, first, mid);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, mid, last);
		sm.addTransition(``, last);
		
		const threadBegin = new ExtPromise(`Thread First`);
		const threadMid = new Resolver(`Thread Mid`, ``);
		sm.addTransition(`${ERROR_PREFIX}!!!`, threadBegin, threadMid);
		const threadId = sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		sm.addDecorator(new InterruptThread(RunMode.START_WITH_STATE, threadId, [`${ERROR_PREFIX}!!!`, 12]), mid);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.cancelSpy.calledOnce, `Thread begin state should have been cancelled`);
			assert(threadMid.onEntrySpy.calledOnce, `Thread mid state should have been entered`);
			assert.equal(threadMid.onEntrySpy.firstCall.args[2], 12, `Thread catch state should have been given the interrupt input`);
			assert.equal(threadMid.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}!!!`, `Thread catch state should have been given the interrupt transition`);
		});
	});
	
	it(`Can interrupt a secondary thread with transition from triggering thread`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`, `foo`);
		sm.addTransition(null, null, first);
		const mid = new Resolver(`Mid`, ``);
		sm.addTransition(`trans`, first, mid);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, mid, last);
		sm.addTransition(``, last);
		
		const threadBegin = new ExtPromise(`Thread First`);
		const threadMid = new Resolver(`Thread Mid`, ``);
		sm.addTransition(`${ERROR_PREFIX}trans`, threadBegin, threadMid);
		const threadId = sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		sm.addDecorator(new InterruptThread(RunMode.START_WITH_STATE, threadId), mid);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.cancelSpy.calledOnce, `Thread begin state should have been cancelled`);
			assert(threadMid.onEntrySpy.calledOnce, `Thread mid state should have been entered`);
			assert.equal(threadMid.onEntrySpy.firstCall.args[2], `foo`, `Thread catch state should have been given the interrupt input`);
			assert.equal(threadMid.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Thread catch state should have been given the interrupt transition`);
		});
	});
	
	it(`No input to interrupt is handled with default error`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new Resolver(`First`, `trans`, `foo`);
		sm.addTransition(null, null, first);
		const mid = new Resolver(`Mid`, ``);
		sm.addTransition(`trans`, first, mid);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, mid, last);
		sm.addTransition(``, last);
		
		const threadBegin = new ExtPromise(`Thread First`);
		const threadMid = new Resolver(`Thread Mid`, ``);
		sm.addTransition(`${ERROR_PREFIX}`, threadBegin, threadMid);
		const threadId = sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		sm.addDecorator(new InterruptThread(RunMode.START_WITH_STATE, threadId), first);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(threadBegin.cancelSpy.calledOnce, `Thread begin state should have been cancelled`);
			assert(threadMid.onEntrySpy.calledOnce, `Thread mid state should have been entered`);
			assert.equal(threadMid.onEntrySpy.firstCall.args[2], undefined, `Thread catch state should have been given the interrupt input`);
			assert.equal(threadMid.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}`, `Thread catch state should have been given the interrupt transition`);
		});
	});
	
	it(`Can interrupt main thread from secondary thread`, function() {
		const sm = new StateMachine<TestSession, number>();
		const first = new ExtPromise(`First`);
		sm.addTransition(null, null, first);
		const mid = new Resolver(`Mid`, ``);
		sm.addTransition(`${ERROR_PREFIX}trans`, first, mid);
		const last = new Resolver(`Last`, `output`, 42);
		sm.addTransition(``, mid, last);
		sm.addTransition(``, last);
		
		const threadBegin = new Resolver(`Thread First`);
		const threadMid = new Resolver(`Thread Mid`, ``);
		sm.addTransition(``, threadBegin, threadMid);
		sm.addDecorator(new BeginThread(RunMode.START_WITH_STATE, threadBegin), first);
		sm.addDecorator(new InterruptThread(RunMode.END_WITH_STATE, MAIN_THREAD, [`${ERROR_PREFIX}trans`, 12]), threadMid);
		
		return sm.run({})
		.then((result) => {
			assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
			assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
			assert(threadBegin.onEntrySpy.calledOnce, `Thread begin state should have been entered`);
			assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
			assert(threadMid.onEntrySpy.calledOnce, `Thread mid state should have been entered`);
			assert.equal(mid.onEntrySpy.firstCall.args[2], 12, `Main catch state should have been given the interrupt input`);
			assert.equal(mid.onEntrySpy.firstCall.args[3], `${ERROR_PREFIX}trans`, `Main catch state should have been given the interrupt transition`);
		});
	});
});