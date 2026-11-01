// Minimal type declaration for the untyped "yalm" logging module.
declare module 'yalm' {
    interface YalmLogger {
        setLevel(level: 'error' | 'warning' | 'info' | 'debug' | string): void;
        emerg(...args: unknown[]): void;
        alert(...args: unknown[]): void;
        critical(...args: unknown[]): void;
        error(...args: unknown[]): void;
        warning(...args: unknown[]): void;
        notice(...args: unknown[]): void;
        info(...args: unknown[]): void;
        debug(...args: unknown[]): void;
    }
    const logging: YalmLogger;
    export = logging;
}
