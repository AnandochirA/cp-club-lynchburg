'use client';

import { useState } from 'react';
import { join as J } from '@/lib/content';
import { IS_PREVIEW } from '@/lib/client-api';
import { submitSignup } from '@/lib/submit';
import { Icon } from './icons';
import { RoadmapDialog } from './RoadmapDialog';

const INPUT =
  'field h-13 w-full min-w-0 rounded-xl bg-white px-3.5 font-sans text-[17px] text-ink-text';
const SELECT = `${INPUT} appearance-none pr-11`;

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.75">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  id,
  name,
  empty,
  options,
  required,
}: {
  id: string;
  name: string;
  empty: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="relative flex">
      <select id={id} name={name} required={required} defaultValue="" className={SELECT}>
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <Icon
        name="chev"
        size={18}
        stroke={2.2}
        className="pointer-events-none absolute top-4.25 right-4 text-ink-muted"
      />
    </div>
  );
}

export function JoinForm() {
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  // The roadmap popup that opens the moment a signup succeeds.
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [claim, setClaim] = useState<string | undefined>();
  const [experience, setExperience] = useState('');
  // That email was already signed up (a returning person, not a new account).
  const [existing, setExisting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('sending');
    setError(null);

    const answers = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      classYear: String(fd.get('classYear') ?? ''),
      major: String(fd.get('major') ?? ''),
      experience: String(fd.get('experience') ?? ''),
    };
    const res = await submitSignup(answers);

    if (res.ok) {
      setClaim(res.claim);
      setExperience(answers.experience);
      setExisting(res.duplicate === true);
      setState('done');
      // A new account goes straight into setup. A returning email chooses.
      setRoadmapOpen(res.duplicate !== true);
      return;
    }
    setState('form');
    setError(
      res.reason === 'duplicate'
        ? J.errors.duplicate
        : res.reason === 'offline'
          ? J.errors.offline
          : res.reason === 'preview'
            ? 'This is a preview of the site, so nothing was saved.'
            : J.errors.generic,
    );
  }

  if (state === 'done') {
    return (
      <>
        <div
          role="status"
          className="mt-7 flex flex-col items-start gap-3 rounded-[22px] bg-white px-5.5 pt-6.5 pb-4.5 text-ink-text shadow-[0_34px_70px_-30px_rgba(40,0,8,0.75)] lg:px-8 lg:pt-8 lg:pb-6"
        >
          <span
            aria-hidden="true"
            className="gloss flex size-12 items-center justify-center rounded-full"
          >
            <Icon name="check" size={24} stroke={2.6} />
          </span>
          <h3 className="font-display m-0 text-[30px] leading-[1.05] font-extrabold tracking-[-0.01em] lg:text-4xl">
            {existing ? J.existing.title : J.success.title}
          </h3>
          <p className="m-0 text-base leading-[1.5] text-ink-muted lg:text-[17px]">
            {existing ? J.existing.sub : J.success.sub}
          </p>
          {!existing && (
            <ol
              aria-label="Next steps"
              className="m-0 mt-0.5 flex list-none flex-col gap-2.5 self-stretch p-0"
            >
              {J.success.steps.map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-3 text-base leading-[1.4] text-[#33353C] lg:text-[17px]"
                >
                  <span
                    aria-hidden="true"
                    className="font-mono flex size-7 shrink-0 items-center justify-center rounded-lg bg-paper text-[13px] font-bold text-crimson-lo"
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-1 flex flex-col gap-2.5 self-stretch sm:flex-row">
            <button
              type="button"
              onClick={() => setRoadmapOpen(true)}
              className="btn btn-primary flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 px-5 font-sans text-[15px] font-semibold text-white"
            >
              <span className="sheen" aria-hidden="true" />
              {J.success.roadmap}
              <Icon name="arrow" size={17} stroke={2.2} className="arrow" />
            </button>
            {existing && !IS_PREVIEW && (
              <a
                href="/signin"
                className="flex h-12 items-center justify-center rounded-[14px] border border-[#E4E0DA] px-5 font-sans text-[15px] font-semibold text-ink-text no-underline hover:text-ink-text"
              >
                {J.signIn}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setState('form')}
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-sans text-[15px] font-semibold text-crimson-lo"
          >
            {J.success.back}
          </button>
        </div>
        <RoadmapDialog
          open={roadmapOpen}
          onClose={() => setRoadmapOpen(false)}
          claim={claim}
          experience={experience}
        />
      </>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-7 flex flex-col gap-4 rounded-[22px] bg-white px-5 pt-5.5 pb-5 text-ink-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_34px_70px_-30px_rgba(40,0,8,0.75)] lg:px-8 lg:pt-7 lg:pb-6.5"
    >
      <Field id="f-name" label={J.fields.name.label}>
        <input
          id="f-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder={J.fields.name.placeholder}
          className={INPUT}
        />
      </Field>
      <Field id="f-email" label={J.fields.email.label}>
        <input
          id="f-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={J.fields.email.placeholder}
          className={INPUT}
        />
      </Field>
      <Field id="f-year" label={J.fields.year.label}>
        <Select
          id="f-year"
          name="classYear"
          empty={J.fields.year.empty}
          options={J.fields.year.options}
        />
      </Field>
      <Field id="f-major" label={J.fields.major.label}>
        <input
          id="f-major"
          name="major"
          type="text"
          placeholder={J.fields.major.placeholder}
          className={INPUT}
        />
      </Field>
      <Field id="f-exp" label={J.fields.experience.label}>
        <Select
          id="f-exp"
          name="experience"
          empty={J.fields.experience.empty}
          options={J.fields.experience.options}
          required
        />
      </Field>

      {error && (
        <p role="alert" className="m-0 text-[15px] leading-[1.45] font-medium text-crimson-lo">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="btn btn-primary mt-1 flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border-0 font-sans text-[17px] font-semibold disabled:cursor-wait disabled:opacity-80"
      >
        <span className="sheen" aria-hidden="true" />
        {state === 'sending' ? J.submitting : J.submit}
        {state !== 'sending' && <Icon name="arrow" size={18} stroke={2.2} className="arrow" />}
      </button>
      {!IS_PREVIEW && (
        <p className="m-0 text-center text-[15px] leading-[1.4] text-ink-muted">
          {J.haveAccount}{' '}
          <a
            href="/signin"
            className="font-semibold text-crimson-lo no-underline hover:text-crimson-lo hover:underline"
          >
            {J.signIn}
          </a>
        </p>
      )}
      <p className="m-0 text-center text-sm leading-[1.4] text-ink-muted">{J.fineprint}</p>
    </form>
  );
}

export function Join() {
  return (
    <section
      id="join"
      aria-labelledby="join-title"
      className="relative flex flex-col overflow-clip px-5 py-19 pb-16 text-white lg:px-30 lg:py-34"
      style={{
        background:
          'radial-gradient(900px 560px at 10% -10%, #CF002A 0%, rgba(207,0,42,0) 70%), radial-gradient(900px 640px at 100% 110%, #6F0019 0%, rgba(111,0,25,0) 72%), #A3001E',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          maskImage: 'radial-gradient(120% 45% at 0% 0%, #000 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(120% 45% at 0% 0%, #000 10%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] gap-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="flex flex-col lg:col-span-5">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[13px] tracking-[0.02em] text-white">
              <span>{'// '}</span>
              {J.eyebrow}
            </span>
            <h2
              id="join-title"
              className="font-display m-0 text-[clamp(2.6rem,7vw,4.5rem)] leading-none font-extrabold tracking-[-0.016em] text-balance"
            >
              {J.title}
              <span className="text-ink">.</span>
            </h2>
            <p className="m-0 mt-0.5 text-[17px] leading-[1.5] text-white/94 lg:text-lg">
              {J.sub} <span className="whitespace-nowrap">{J.subNowrap}</span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <JoinForm />
        </div>
      </div>
    </section>
  );
}
