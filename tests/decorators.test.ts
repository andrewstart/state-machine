import {StateMachine, Decorator, RunMode, State, Transition, ERROR_PREFIX} from '../';
import {Rejecter, Resolver, TestSession} from './utils';
import assert = require('assert');
import sinon = require('sinon');

class DecoratorSpy extends Decorator<number> {
    public runSpy:sinon.SinonSpy;
    public initVal:number;
    constructor(runMode:RunMode, initVal?:number) {
        super(runMode);
        this.runSpy = sinon.spy(this, `run`);
        this.initVal = initVal;
    }
    
    public init(sm:StateMachine):number {
        return this.initVal;
    }
    
    public run(sm:StateMachine, session:any, state:State<any>, result:Transition) {
        //no op
    }
}

describe(`Decorators`, function() {
    describe(`Local Decorators`, function() {
        it(`Adding Decorators returns value from init()`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Resolver(`First`, `trans`, 76);
            const initVal = sm.addDecorator(new DecoratorSpy(RunMode.STATE_START, 32), first);
            assert.equal(initVal, 32, `initVal should be the output from DecoratorSpy.init()`);
        });
        
        it(`Decorators run at start of state`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Resolver(`First`, `trans`, 76);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`trans`, first, last);
            sm.addTransition(``, last);
            const decorator = new DecoratorSpy(RunMode.STATE_START);
            sm.addDecorator(decorator, last);
            return sm.run({})
            .then((result) => {
                assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(decorator.runSpy.calledOnce, `Decorator should have been run`);
                assert(decorator.runSpy.calledBefore(last.onEntrySpy), `Decorator should have been run before last state`);
                assert.equal(decorator.runSpy.firstCall.args[3][0], `trans`, `Decorator transition should be state incoming transition`);
                assert.equal(decorator.runSpy.firstCall.args[3][1], 76, `Decorator input should be state input`);
            });
        });
        
        it(`Decorators run at end of state`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Resolver(`First`, `trans`, 76);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`trans`, first, last);
            sm.addTransition(``, last);
            const decorator = new DecoratorSpy(RunMode.STATE_END);
            sm.addDecorator(decorator, first);
            return sm.run({})
            .then((result) => {
                assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(decorator.runSpy.calledOnce, `Decorator should have been run`);
                assert(decorator.runSpy.calledAfter(first.onEntrySpy), `Decorator should have been run after first state`);
                assert.equal(decorator.runSpy.firstCall.args[3][0], `trans`, `Decorator transition should be state outgoing transition`);
                assert.equal(decorator.runSpy.firstCall.args[3][1], 76, `Decorator input should be state output`);
            });
        });
        
        it(`Decorators run after state rejections`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Rejecter(`First`, [`trans`, 76]);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
            sm.addTransition(``, last);
            const decorator = new DecoratorSpy(RunMode.STATE_END);
            sm.addDecorator(decorator, first);
            return sm.run({})
            .then((result) => {
                assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(decorator.runSpy.calledOnce, `Decorator should have been run`);
                assert(decorator.runSpy.calledAfter(first.onEntrySpy), `Decorator should have been run after first state`);
                assert.equal(decorator.runSpy.firstCall.args[3][0], `${ERROR_PREFIX}trans`, `Decorator transition should be state outgoing transition`);
                assert.equal(decorator.runSpy.firstCall.args[3][1], 76, `Decorator input should be state output`);
            });
        });
    });
    
    describe(`Global Decorators`, function() {
        it(`Adding Decorators returns value from init()`, function() {
            const sm = new StateMachine<TestSession, number>();
            const initVal = sm.addDecorator(new DecoratorSpy(RunMode.STATE_START, 32));
            assert.equal(initVal, 32, `initVal should be the output from DecoratorSpy.init()`);
        });
        
        it(`Decorators run at start of state`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Resolver(`First`, `trans`, 76);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`trans`, first, last);
            sm.addTransition(``, last);
            const decorator = new DecoratorSpy(RunMode.STATE_START);
            sm.addDecorator(decorator);
            return sm.run({})
            .then((result) => {
                assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(decorator.runSpy.calledTwice, `Decorator should have been run`);
                assert.equal(decorator.runSpy.firstCall.args[3][0], undefined, `Decorator transition should be state incoming transition (first)`);
                assert.equal(decorator.runSpy.firstCall.args[3][1], null, `Decorator input should be state input (first)`);
                assert.equal(decorator.runSpy.secondCall.args[3][0], `trans`, `Decorator transition should be state incoming transition (second)`);
                assert.equal(decorator.runSpy.secondCall.args[3][1], 76, `Decorator input should be state input (second)`);
            });
        });
        
        it(`Decorators run at end of state`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Resolver(`First`, `trans`, 76);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`trans`, first, last);
            sm.addTransition(``, last);
            const decorator = new DecoratorSpy(RunMode.STATE_END);
            sm.addDecorator(decorator);
            return sm.run({})
            .then((result) => {
                assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(decorator.runSpy.calledTwice, `Decorator should have been run`);
                assert.equal(decorator.runSpy.firstCall.args[3][0], `trans`, `Decorator transition should be state outgoing transition`);
                assert.equal(decorator.runSpy.firstCall.args[3][1], 76, `Decorator input should be state output`);
                assert.equal(decorator.runSpy.secondCall.args[3][0], `output`, `Decorator transition should be state incoming transition (second)`);
                assert.equal(decorator.runSpy.secondCall.args[3][1], 42, `Decorator input should be state input (second)`);
            });
        });
        
        it(`Decorators run after state rejections`, function() {
            const sm = new StateMachine<TestSession, number>();
            const first = new Rejecter(`First`, [`trans`, 76]);
            sm.addTransition(null, null, first);
            const last = new Resolver(`Last`, `output`, 42);
            sm.addTransition(`${ERROR_PREFIX}trans`, first, last);
            sm.addTransition(``, last);
            const decorator = new DecoratorSpy(RunMode.STATE_END);
            sm.addDecorator(decorator);
            return sm.run({})
            .then((result) => {
                assert(first.onEntrySpy.calledOnce, `First state should have been entered`);
                assert(last.onEntrySpy.calledOnce, `Last state should have been entered`);
                assert(decorator.runSpy.calledTwice, `Decorator should have been run`);
                assert.equal(decorator.runSpy.firstCall.args[3][0], `${ERROR_PREFIX}trans`, `Decorator transition should be state outgoing transition`);
                assert.equal(decorator.runSpy.firstCall.args[3][1], 76, `Decorator input should be state output`);
                assert.equal(decorator.runSpy.secondCall.args[3][0], `output`, `Decorator transition should be state incoming transition (second)`);
                assert.equal(decorator.runSpy.secondCall.args[3][1], 42, `Decorator input should be state input (second)`);
            });
        });
    });
});