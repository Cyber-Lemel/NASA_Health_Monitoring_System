import { useState } from 'react';
import { Clock, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';

type Field = {
    key: string;
    label: string;
    unit: string;
    group: 'vitals' | 'other';
    step: string;
    placeholder: string;
    hint?: string; // text shown under the input
    nominal?: (n: number) => boolean; // true = nominal
    hard: [number, number]; // values outside this are invalid
    gen: [number, number, number]; // simulated min, max, decimals
};

const FIELDS: Field[] = [
    { key: 'systolic', label: 'Systolic BP', unit: 'mmHg', group: 'vitals', step: '1', placeholder: 'e.g. 118', hint: 'Nominal: < 120', nominal: (n) => n < 120, hard: [70, 250], gen: [100, 119, 0] },
    { key: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', group: 'vitals', step: '1', placeholder: 'e.g. 76', hint: 'Nominal: < 80', nominal: (n) => n < 80, hard: [40, 150], gen: [60, 79, 0] },
    { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', group: 'vitals', step: '1', placeholder: 'e.g. 74', hint: 'Nominal: 60 - 100', nominal: (n) => n >= 60 && n <= 100, hard: [30, 220], gen: [60, 100, 0] },
    { key: 'spo2', label: 'SpO2 Oxygen', unit: '%', group: 'vitals', step: '1', placeholder: 'e.g. 98', hint: 'Nominal: 95 - 100%', nominal: (n) => n >= 95 && n <= 100, hard: [70, 100], gen: [95, 99, 0] },
    { key: 'cabinPco2', label: 'Cabin pCO2', unit: 'mmHg', group: 'vitals', step: '0.1', placeholder: 'e.g. 2.4', hint: 'Limit: < 3.0 mmHg', nominal: (n) => n < 3.0, hard: [0, 10], gen: [1.5, 2.9, 1] },
    { key: 'bodyTemp', label: 'Body Temperature', unit: '°C', group: 'other', step: '0.1', placeholder: 'e.g. 36.7', hard: [35, 38.5], gen: [36.2, 37.2, 1] },
    { key: 'sleepDuration', label: 'Sleep Duration', unit: 'hours', group: 'other', step: '0.1', placeholder: 'e.g. 7.2', hard: [0, 14], gen: [6, 8.5, 1] },
    { key: 'exerciseDur', label: 'Exercise Duration', unit: 'minutes', group: 'other', step: '1', placeholder: 'e.g. 42', hard: [0, 300], gen: [15, 60, 0] },
];

type Form = Record<string, string>;
type Errors = Record<string, string>;

const MAX_NOTES = 500;

const emptyForm: Form = {
    ...Object.fromEntries(FIELDS.map((f) => [f.key, ''])),
    fatigueLevel: '3',
    symptoms: '',
};

const rand = (min: number, max: number, decimals = 0) =>
    Number((Math.random() * (max - min) + min).toFixed(decimals));

const generateReading = (): Form => ({
    ...Object.fromEntries(FIELDS.map((f) => [f.key, String(rand(f.gen[0], f.gen[1], f.gen[2]))])),
    fatigueLevel: String(rand(1, 5)),
    symptoms: '',
});

const validate = (form: Form): Errors => {
    const errors: Errors = {};

    FIELDS.forEach((f) => {
        const value = form[f.key].trim();
        const [min, max] = f.hard;

        if (value === '') errors[f.key] = `${f.label} is required.`;
        else if (Number.isNaN(Number(value))) errors[f.key] = 'Enter a valid number.';
        else if (Number(value) < min || Number(value) > max) errors[f.key] = `Must be between ${min} and ${max}.`;
    });

    if (form.symptoms.length > MAX_NOTES) {
        errors.symptoms = `Notes must be ${MAX_NOTES} characters or less.`;
    }
    return errors;
};

export default function HealthMonitoring() {
    const [simulated, setSimulated] = useState(false);
    const [form, setForm] = useState<Form>(emptyForm);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitted, setSubmitted] = useState(false);
    const [lastEntry, setLastEntry] = useState<Date | null>(null);
    const [message, setMessage] = useState('');

    const label = 'flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400';
    const unit = 'font-normal normal-case text-slate-500';
    const input = 'mt-2 w-full rounded-xl border bg-[#0a1220] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-slate-600';
    const card = 'rounded-2xl border border-slate-800 bg-[#0b1626] p-6';

    const errors = validate(form);

    const showError = (name: string) =>
        (touched[name] || submitted) && errors[name] ? errors[name] : '';

    // A filled, valid value that is outside its nominal range
    const isOffNominal = (f: Field) => {
        const v = form[f.key].trim();
        if (v === '' || errors[f.key] || !f.nominal) return false;
        return !f.nominal(Number(v));
    };

    const inputClass = (f: { key: string }) => {
        const field = FIELDS.find((x) => x.key === f.key);
        const border = showError(f.key)
            ? 'border-red-500 focus:border-red-400'
            : field && isOffNominal(field)
              ? 'border-amber-400 focus:border-amber-300'
              : 'border-slate-700 focus:border-cyan-400';
        return `${input} ${border}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setMessage('');
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTouched({ ...touched, [e.target.name]: true });
    };

    const handleToggle = (checked: boolean) => {
        setSimulated(checked);
        setForm(checked ? generateReading() : emptyForm);
        setTouched({});
        setSubmitted(false);
        setMessage('');
    };

    // Completeness
    const values = Object.values(form);
    const filled = values.filter((v) => v.trim() !== '').length;
    const completeness = Math.round((filled / values.length) * 100);

    // Sidebar status
    const offNominal = FIELDS.filter(isOffNominal);

    const lastEntryText = () => {
        if (!lastEntry) return 'No entries yet';
        const mins = Math.floor((Date.now() - lastEntry.getTime()) / 60000);
        return mins < 1 ? 'Last entry was just now' : `Last entry was ${mins} min ago`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);

        if (Object.keys(errors).length > 0) {
            setMessage('Please fix the highlighted fields.');
            return;
        }

        // TODO: send to the backend later, e.g. router.post('/health-checkins', form)
        console.log('Check-in saved:', { ...form, simulated });
        setLastEntry(new Date());
        setMessage('Health check-in saved.');
        setForm(emptyForm);
        setTouched({});
        setSubmitted(false);
        setSimulated(false);
    };

    const hasErrors = message === 'Please fix the highlighted fields.';

    const renderField = (f: Field) => (
        <div key={f.key}>
            <label htmlFor={f.key} className={label}>
                {f.label} <span className={unit}>{f.unit}</span>
            </label>
            <input
                id={f.key}
                name={f.key}
                type="number"
                step={f.step}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputClass(f)}
            />
            {showError(f.key) ? (
                <p className="mt-1 text-xs text-red-400">{showError(f.key)}</p>
            ) : (
                f.hint && (
                    <p className={`mt-1 text-xs ${isOffNominal(f) ? 'text-amber-400' : 'text-slate-500'}`}>
                        {f.hint}
                    </p>
                )
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060d18] p-8 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                Manual &amp; Simulated Data Entry
            </p>
            <h1 className="mt-1 text-3xl font-bold">Health Monitoring</h1>

            <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
                <form onSubmit={handleSubmit} noValidate className={card}>
                    <h2 className="font-bold">New health check-in</h2>
                    <p className="text-sm text-slate-400">
                        Enter measurements manually or generate a safe simulated reading
                    </p>

                    <h3 className="mt-6 text-xs font-bold uppercase tracking-widest text-cyan-400">Vital signs</h3>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5 xl:grid-cols-3">
                        {FIELDS.filter((f) => f.group === 'vitals').map(renderField)}
                    </div>

                    <h3 className="mt-8 text-xs font-bold uppercase tracking-widest text-cyan-400">Daily factors</h3>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
                        {FIELDS.filter((f) => f.group === 'other').map(renderField)}

                        <div>
                            <label htmlFor="fatigueLevel" className={label}>
                                Fatigue Level <span className={unit}>{form.fatigueLevel}/10</span>
                            </label>
                            <input
                                id="fatigueLevel"
                                name="fatigueLevel"
                                type="range"
                                min="1"
                                max="10"
                                value={form.fatigueLevel}
                                onChange={handleChange}
                                className="mt-5 w-full accent-cyan-400"
                            />
                        </div>
                    </div>

                    <div className="mt-5">
                        <label htmlFor="symptoms" className={label}>
                            Symptoms or Notes
                            <span className={unit}>
                                {form.symptoms.length}/{MAX_NOTES}
                            </span>
                        </label>
                        <textarea
                            id="symptoms"
                            name="symptoms"
                            rows={4}
                            placeholder="Describe any symptoms, discomfort, or contextual notes..."
                            value={form.symptoms}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={inputClass({ key: 'symptoms' })}
                        ></textarea>
                        {showError('symptoms') && <p className="mt-1 text-xs text-red-400">{showError('symptoms')}</p>}
                    </div>

                    {message && (
                        <p className={`mt-4 text-sm ${hasErrors ? 'text-red-400' : 'text-cyan-300'}`}>{message}</p>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5">
                        <label className="flex cursor-pointer items-center gap-3">
                            <input
                                type="checkbox"
                                checked={simulated}
                                onChange={(e) => handleToggle(e.target.checked)}
                                className="sr-only"
                            />
                            <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${simulated ? 'bg-cyan-400' : 'bg-slate-600'}`}>
                                <span className={`h-5 w-5 rounded-full bg-white transition ${simulated ? 'translate-x-5' : ''}`}></span>
                            </span>
                            <span>
                                <span className="block text-sm font-semibold">Use simulated data</span>
                                <span className="block text-xs text-slate-500">Generates values within safe demo ranges</span>
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-900 hover:bg-cyan-300"
                        >
                            Save health check-in
                        </button>
                    </div>
                </form>

                <aside className="space-y-6">
                    <div className={card}>
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase text-cyan-300">
                            <Sparkles size={14} /> Simulation mode
                        </span>
                        <h3 className="mt-4 text-lg font-bold">Software-only inputs</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            All readings in this prototype come from manual entry, generated simulation, or
                            uploaded datasets. No wearables or physical sensors are connected.
                        </p>
                    </div>

                    <div className={card}>
                        <h3 className="font-bold">Input quality</h3>
                        <p className="text-sm text-slate-400">Current check-in completeness</p>

                        <div className="mt-5 flex justify-between text-sm">
                            <span className="text-slate-400">Completeness</span>
                            <span className="font-bold text-emerald-400">{completeness}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-800">
                            <div
                                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                                style={{ width: `${completeness}%` }}
                            ></div>
                        </div>

                        <p className="mt-5 flex items-center gap-2 text-sm text-slate-400">
                            {offNominal.length === 0 ? (
                                <>
                                    <ShieldCheck size={16} className="text-emerald-400" />
                                    Values are within nominal ranges
                                </>
                            ) : (
                                <>
                                    <ShieldAlert size={16} className="shrink-0 text-amber-400" />
                                    Outside nominal: {offNominal.map((f) => f.label).join(', ')}
                                </>
                            )}
                        </p>
                        <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                            <Clock size={16} className="text-cyan-400" />
                            {lastEntryText()}
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}