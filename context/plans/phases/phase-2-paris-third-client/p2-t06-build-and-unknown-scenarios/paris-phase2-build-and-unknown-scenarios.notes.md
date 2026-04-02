# P2-T06 Notes

## Input-Class Discipline

- The unknown-payload check continues to use the accepted phase-1 input class:
  mutate a real Paris V1 `payloadId` obtained from the same client at runtime.
- Arbitrary `DATA(8)` values remain out of scope for `PARIS-METHOD-GP-02` and
  are still treated as a separate implementation-behavior observation class.
