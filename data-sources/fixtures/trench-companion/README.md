# Trench Companion fixtures

Share-link envelopes, exactly as
`https://synod.trench-companion.com/wp-json/synod/v1/warband/<id>` returned
them. `warband_data` is a JSON string inside the JSON; that is their shape and
it is kept verbatim rather than unpacked, because the thing under test is the
reading of what they actually serve.

See [`docs/TRENCH-COMPANION-IMPORT.md`](../../../docs/TRENCH-COMPANION-IMPORT.md).

## `al-qarn-rihla-505410.json`

**The owner's own warband**, supplied by them for this purpose:
`trench-companion.com/warband/detail/505410` — Al-Qarn Rihla, Iron Sultanate,
House of Wisdom, thirteen models, campaign round 5. Fetched once, on
25 September 2026.

It is the **progressed** version of the warband, one game on from
`newrecruit/al-qarn-rihla-september.json`. **The two are not the same roster**
and no test asserts they are; shared models can be cross-checked by hand, but
the rosters have diverged and that is expected.

### Why this one and not the other

The import's shape was first measured against a **public warband belonging to a
stranger**. That record is deliberately **not** committed, nothing in the tests
reads it, and its id is not written down here either: measuring a shape against
a public record is one thing, and publishing the pointer to somebody's roster —
in a repository, in a test, or in a comment — is another. It is not ours to
publish.

### What it settles that a hand-built envelope cannot

Nine things, each of which the importer got wrong or had never seen until this
file arrived — they are listed in the doc and pinned in
`src/services/__tests__/trenchCompanionFixture.test.ts`. The two largest:

- **`model.name` is the PLAYER's name where one is set.** On the warband the
  shape was first measured against, every model carried its entry's display
  name, so resolving by name worked by accident. Here it is `Jawhar al-Sari` on a `md_mamlukfaris` and
  `Al-Qahhar, the Crippled` on a `md_brazenbull`. Resolution is by the slug
  first, and the name is the player's.
- **Their slugs carry structure.** `md_azeb_mv_kavass` is the Azeb under a
  named Variant; `md_takwincreation_golem` is a Takwin Homunculus the Book of
  Golems created.
