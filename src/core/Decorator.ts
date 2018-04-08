import {StateMachine} from './StateMachine';
import {State} from './State';
import {Transition} from './types';

export enum RunMode {
    STATE_START,
    STATE_END
}

export abstract class Decorator<T> {
    public runMode: RunMode;
    
    constructor(mode: RunMode) {
        this.runMode = mode;
    }
    
    public abstract init(sm: StateMachine): T;
    
    public abstract run(sm: StateMachine, session:any, state:State<any>, result:Transition):void;
}