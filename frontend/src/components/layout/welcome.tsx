'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { dictionaries, languageNames } from '@/i18n'
import type { Language } from '@/types'

const languages: Language[] = ['en', 'te', 'hi']
export function Welcome() {
  const [language, setLanguage] = useState<Language>('en')
  const copy = dictionaries[language]
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <div role="group" aria-label="Language" className="flex flex-wrap gap-2">
        {languages.map(option => (
          <Button key={option} lang={option} aria-pressed={language === option}
            variant={language === option ? 'default' : 'outline'} onClick={() => setLanguage(option)}>
            {languageNames[option]}
          </Button>
        ))}
      </div>
      <div lang={language}>
        <h1 className="mt-10 max-w-3xl font-display text-5xl leading-tight font-semibold sm:text-7xl">{copy.headline}</h1>
        <p className="mt-5 max-w-xl text-lg">{copy.description}</p>
        <p className="mt-16 border-t border-border pt-5 text-sm text-muted-foreground">{copy.sampleNotice}</p>
      </div>
    </section>
  )
}
