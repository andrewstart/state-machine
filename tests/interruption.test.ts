import {StateMachine, ERROR_PREFIX} from '../';
import {ExtPromise, Resolver, TestSession} from './utils';
import assert = require('assert');

describe(`Interruption`, function() {
    it(`Can be stopped`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        const session = {};
        sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        });
        sm.stop(session);
        assert(last.onEntrySpy.notCalled, `Last state should not have been entered`);
        //private property check!
        assert.equal((sm as any).threads.has(session), false, `Should not retain threads for session`);
    });
    
    it(`Can 'stop' non-running StateMachines`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        const session = {};
        sm.stop(session);
    });
    
    it(`Can interrupt a state as an error`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        }, (errResult) => {
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(errResult[0], `${ERROR_PREFIX}interrupt`, `Should have rejected state machine (due to unhandled error transition)`);
        });
        sm.interrupt(session, `interrupt`);
        return result;
    });
    
    it(`Interrupted states that resolve are ignored`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        }, (errResult) => {
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(errResult[0], `${ERROR_PREFIX}interrupt`, `Should have rejected state machine (due to unhandled error transition)`);
        });
        sm.interrupt(session, `interrupt`);
        first.resolve([`trans`, null]);
        return result;
    });
    
    it(`Interrupted states that reject are ignored`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`trans`, first, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        }, (errResult) => {
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(errResult[0], `${ERROR_PREFIX}interrupt`, `Should have rejected state machine (due to unhandled error transition)`);
        });
        sm.interrupt(session, `interrupt`);
        first.reject([`trans`, null]);
        return result;
    });
    
    it(`Interruptions are handled by global errors`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`${ERROR_PREFIX}interrupt`, null, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}interrupt`, `Catching state should have been entered with the interrupt transition`);
            assert.equal(last.onEntrySpy.getCall(0).args[2], `foobar`, `Catching state should have been entered with the interrupt data`);
        });
        sm.interrupt(session, `interrupt`, `foobar`);
        return result;
    });
    
    it(`Interruptions are handled by local errors`, function() {
        const sm = new StateMachine<TestSession, number>();
        const first = new ExtPromise(`First`);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`${ERROR_PREFIX}interrupt`, first, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(first.cancelSpy.calledOnce, `First state should have been cancelled`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}interrupt`, `Catching state should have been entered with the interrupt transition`);
            assert.equal(last.onEntrySpy.getCall(0).args[2], `foobar`, `Catching state should have been entered with the interrupt data`);
        });
        sm.interrupt(session, `interrupt`, `foobar`);
        return result;
    });
    
    it(`Attempting to interrupt non-running StateMachine throws error`, function() {
        assert.throws(() => {
            const sm = new StateMachine<TestSession, number>();
            const first = new ExtPromise(`First`);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`trans`, first, last);
            sm.addTransition(``, last);
            const session = {};
            sm.interrupt(session, `interrupt`);
        }, `Should throw error`);
    });
});