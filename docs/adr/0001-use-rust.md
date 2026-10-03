# Use Rust for mactions

mactions targets Macs with 8 GB of RAM and prioritizes low resident memory overhead for its optional web service. Use Rust for the application, with shared runner-management logic for the standalone CLI and web interface; accept the additional ownership and borrowing complexity compared with Go in exchange for more direct control over allocations and lifetimes without a tracing garbage collector. Both languages can provide a prebuilt application without requiring users to install a language toolchain, so installation convenience does not decide this choice.

This is a design choice, not a measured memory result. Measure idle service memory, active viewing, and operation peaks including temporary management subprocesses; report runner/job and browser memory separately.
