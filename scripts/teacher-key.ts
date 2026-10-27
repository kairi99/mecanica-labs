// Writes docs/teacher-key.md (Practica 1), docs/teacher-key-parabolic.md (Practica 2) and docs/teacher-key-newton2.md (Practica 3) from the models.
// Run with: npm run teacher-key  (Node 24+ strips types natively).
import { mkdirSync, writeFileSync } from 'node:fs'
import { teacherKey } from '../src/experiments/mruv/pedagogy/teacherKey.ts'
import { teacherKey as parabolicTeacherKey } from '../src/experiments/parabolic/pedagogy/teacherKey.ts'
import { teacherKey as newton2TeacherKey } from '../src/experiments/newton2/pedagogy/teacherKey.ts'

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true })
for (const [name, text] of [['teacher-key.md', teacherKey()], ['teacher-key-parabolic.md', parabolicTeacherKey()], ['teacher-key-newton2.md', newton2TeacherKey()]] as const) {
  const out = new URL(`../docs/${name}`, import.meta.url)
  writeFileSync(out, text + '\n')
  console.log(`wrote ${out.pathname}`)
}
