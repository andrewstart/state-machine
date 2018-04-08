import {StateMachine, SubMachine, ERROR_PREFIX} from '../';
import {ExtPromise, Resolver, Rejecter, TestSession} from './utils';
import assert = require('assert');

describe(`SubMachine state`, function() {
    it(`Can create and destroy`, function() {
        const sm = new StateMachine<TestSession>();
        const first = new SubMachine(`First`, sm);
        first.destroy();
    });
    
    it(`SubMachine handles its output correctly`, function() {
        const sub = new StateMachine<TestSession, number>();
        const subState = new Resolver(`Sub`, `subOut`, 23);
        sub.addTransition(null, null, subState);
        sub.addTransition(``, subState);
        
        const sm = new StateMachine<TestSession, number>();
        const first = new SubMachine(`First`, sub);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, first, last);
        sm.addTransition(``, last);
        const session = {};
        return sm.run(session)
        .then((result) => {
            assert(subState.onEntrySpy.calledOnce, `State inside SubMachine should have been entered`);
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(subState.onEntrySpy.calledBefore(last.onEntrySpy), `State inside SubMachine should have been entered before last state`);
            assert.equal(last.onEntrySpy.getCall(0).args[2], 23, `Output from SubMachine should be output from the state machine inside`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `subOut`, `Transition from SubMachine should be transition from the state machine inside`);
        });
    });
    
    it(`SubMachine handles rejections correctly`, function() {
        const sub = new StateMachine<TestSession, number>();
        const subState = new Rejecter(`Sub`, `${ERROR_PREFIX}subOut`);
        sub.addTransition(null, null, subState);
        sub.addTransition(``, subState);
        
        const sm = new StateMachine<TestSession, number>();
        const first = new SubMachine(`First`, sub);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(`${ERROR_PREFIX}subOut`, first, last);
        sm.addTransition(``, last);
        const session = {};
        return sm.run(session)
        .then((result) => {
            assert(subState.onEntrySpy.calledOnce, `State inside SubMachine should have been entered`);
            assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
            assert(subState.onEntrySpy.calledBefore(last.onEntrySpy), `State inside SubMachine should have been entered before last state`);
            assert.equal(last.onEntrySpy.getCall(0).args[3], `${ERROR_PREFIX}subOut`, `Transition from SubMachine should be transition from the state machine inside`);
        });
    });
    
    it(`SubMachine can be interrupted`, function() {
        const sub = new StateMachine<TestSession, number>();
        const subState = new ExtPromise(`Sub`);
        sub.addTransition(null, null, subState);
        sub.addTransition(``, subState);
        
        const sm = new StateMachine<TestSession, number>();
        const first = new SubMachine(`First`, sub);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, first, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        }, (errResult) => {
            assert.equal(errResult[0], `${ERROR_PREFIX}interrupt`, `Should have rejected state machine (due to unhandled error transition)`);
        });
        sm.interrupt(session, `interrupt`);
        return result;
    });
    
    it(`SubMachine internal StateMachine can be interrupted`, function() {
        const sub = new StateMachine<TestSession, number>();
        const subState = new ExtPromise(`Sub`);
        sub.addTransition(null, null, subState);
        sub.addTransition(``, subState);
        
        const sm = new StateMachine<TestSession, number>();
        const first = new SubMachine(`First`, sub);
        sm.addTransition(null, null, first);
        const last = new Resolver(`Last`, `output`, 42);
        sm.addTransition(``, first, last);
        sm.addTransition(``, last);
        const session = {};
        const result = sm.run(session)
        .then((result) => {
            throw new Error(`Should not have resolved`);
        }, (errResult) => {
            assert.equal(errResult[0], `${ERROR_PREFIX}innerInterrupt`, `Should have rejected state machine (due to unhandled error transition)`);
        });
        sub.interrupt(session, `innerInterrupt`);
        return result;
    });
});