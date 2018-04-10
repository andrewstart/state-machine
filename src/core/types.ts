/**
 * The transition data that all states should return when complete.
 * The first value is the transition name.
 * The second value is the data.
 */
export type Transition<T = any> = [string, T];

/**
 * A callback for when a wrapped promise has been cancelled.
 */
export type CancelHandler = () => void;