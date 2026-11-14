import { useState } from 'react';
import { Clock, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';

type Form = {
    heartRate: string;
    bloodOxygen: string;
    bodyTemp: string;
    sleepDuration: string;
    fatigueLevel: string;
    exerciseDur: string;
    symptoms: string;
};

type Errors = Partial<Record<keyof Form, string>>;

const emptyForm: Form = {
    heartRate: '',
    bloodOxygen: '',
    bodyTemp: '',
    sleepDuration: '',
    fatigueLevel: '3',
    exerciseDur: '',
    symptoms: '',
};

// Validation rules: [min, max]
const ranges = {
    heartRate: [40, 180],
    bloodOxygen: [90, 100],
    bodyTemp: [35, 38.5],
    sleepDuration: [0, 14],
    exerciseDur: [0, 300],
} as const;

const fieldNames: Record<keyof typeof ranges, string> = {
    heartRate: 'Heart rate',
    bloodOxygen: 'Blood oxygen',
    bodyTemp: 'Body temperature',
    sleepDuration: 'Sleep duration',
    exerciseDur: 'Exercise duration',
};

const MAX_NOTES = 500;

const rand = (min: number, max: number, decimals = 0) =>
    Number((Math.random() * (max - min) + min).toFixed(decimals));

const generateReading = (): Form => ({
    heartRate: String(rand(60, 100)),
    bloodOxygen: String(rand(95, 99)),
    bodyTemp: String(rand(36.2, 37.2, 1)),
    sleepDuration: String(rand(6, 8.5, 1)),
    fatigueLevel: String(rand(1, 5)),
    exerciseDur: String(rand(15, 60)),
    symptoms: '',
});

// Returns an error message per invalid field
const validate = (form: Form): Errors => {
    const errors: Errors = {};

    (Object.keys(ranges) as (keyof typeof ranges)[]).forEach((key) => {
        const value = form[key].trim();
        const [min, max] = ranges[key];

        if (value === '') {
            errors[key] = `${fieldNames[key]} is required.`;
        } else if (Number.isNaN(Number(value))) {
            errors[key] = 'Enter a valid number.';
        } else if (Number(value) < min || Number(value) > max) {
            errors[key] = `Must be between ${min} and ${max}.`;
        }
    });

    if (form.symptoms.length > MAX_NOTES) {
        errors.symptoms = `Notes must be ${MAX_NOTES} characters or less.`;
    }

    return errors;
};

export default function HealthMonitoring() {
    const [simulated, setSimulated] = useState(false);
    const [form, setForm] = useState<Form>(emptyForm);
    const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [lastEntry, setLastEntry] = useState<Date | null>(null);
    const [message, setMessage] = useState('');

    const label = 'flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400';
    const unit = 'font-normal normal-case text-slate-500';
    const input = 'mt-2 w-full rounded-xl border bg-[#0a1220] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:font-normal placeholder:text-slate-600';
    const card = 'rounded-2xl border border-slate-800 bg-[#0b1626] p-6';

    const errors = validate(form);

    // Show an error only after the field was touched or the form was submitted
    const showError = (name: keyof Form) =>
        (touched[name] || submitted) && errors[name] ? errors[name] : '';

    const inputClass = (name: keyof Form) =>
        `${input} ${showError(name) ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-cyan-400'}`;

    const ErrorText = ({ name }: { name: keyof Form }) =>
        showError(name) ? <p className="mt-1 text-xs text-red-400">{showError(name)}</p> : null;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setMessage('');
    };

    const handleBlur = (
        e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setTouched({ ...touched, [e.target.name]: true });
    };

    const handleToggle = (checked: boolean) => {
        setSimulated(checked);
        setForm(checked ? generateReading() : emptyForm);
        setTouched({});
        setSubmitted(false);
        setMessage('');
    };

    // Completeness: share of the 7 fields that are filled
    const values = Object.values(form);
    const filled = values.filter((v) => v.trim() !== '').length;
    const completeness = Math.round((filled / values.length) * 100);

    // Out-of-range check for the sidebar card (only for filled fields)
    const outOfRange = (Object.keys(ranges) as (keyof typeof ranges)[]).filter(
        (key) => {
            if (form[key] === '') return false;
            const n = Number(form[key]);
            const [min, max] = ranges[key];
            return n < min || n > max;
        },
    );
    const inRange = outOfRange.length === 0;

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

                    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
                        <div>
                            <label htmlFor="heartRate" className={label}>
                                Heart Rate <span className={unit}>BPM</span>
                            </label>
                            <input id="heartRate" name="heartRate" type="number" placeholder="e.g. 74"
                                value={form.heartRate} onChange={handleChange} onBlur={handleBlur}
                                className={inputClass('heartRate')} />
                            <ErrorText name="heartRate" />
                        </div>

                        <div>
                            <label htmlFor="bloodOxygen" className={label}>
                                Blood Oxygen <span className={unit}>SpO2 %</span>
                            </label>
                            <input id="bloodOxygen" name="bloodOxygen" type="number" placeholder="e.g. 98"
                                value={form.bloodOxygen} onChange={handleChange} onBlur={handleBlur}
                                className={inputClass('bloodOxygen')} />
                            <ErrorText name="bloodOxygen" />
                        </div>

                        <div>
                            <label htmlFor="bodyTemp" className={label}>
                                Body Temperature <span className={unit}>&deg;C</span>
                            </label>
                            <input id="bodyTemp" name="bodyTemp" type="number" step="0.1" placeholder="e.g. 36.7"
                                value={form.bodyTemp} onChange={handleChange} onBlur={handleBlur}
                                className={inputClass('bodyTemp')} />
                            <ErrorText name="bodyTemp" />
                        </div>

                        <div>
                            <label htmlFor="sleepDuration" className={label}>
                                Sleep Duration <span className={unit}>hours</span>
                            </label>
                            <input id="sleepDuration" name="sleepDuration" type="number" step="0.1" placeholder="e.g. 7.2"
                                value={form.sleepDuration} onChange={handleChange} onBlur={handleBlur}
                                className={inputClass('sleepDuration')} />
                            <ErrorText name="sleepDuration" />
                        </div>

                        <div>
                            <label htmlFor="fatigueLevel" className={label}>
                                Fatigue Level <span className={unit}>{form.fatigueLevel}/10</span>
                            </label>
                            <input id="fatigueLevel" name="fatigueLevel" type="range" min="1" max="10"
                                value={form.fatigueLevel} onChange={handleChange}
                                className="mt-5 w-full accent-cyan-400" />
                        </div>

                        <div>
                            <label htmlFor="exerciseDur" className={label}>
                                Exercise Duration <span className={unit}>minutes</span>
                            </label>
                            <input id="exerciseDur" name="exerciseDur" type="number" placeholder="e.g. 42"
                                value={form.exerciseDur} onChange={handleChange} onBlur={handleBlur}
                                className={inputClass('exerciseDur')} />
                            <ErrorText name="exerciseDur" />
                        </div>
                    </div>

                    <div className="mt-5">
                        <label htmlFor="symptoms" className={label}>
                            Symptoms or Notes
                            <span className={unit}>{form.symptoms.length}/{MAX_NOTES}</span>
                        </label>
                        <textarea id="symptoms" name="symptoms" rows={4}
                            placeholder="Describe any symptoms, discomfort, or contextual notes..."
                            value={form.symptoms} onChange={handleChange} onBlur={handleBlur}
                            className={inputClass('symptoms')}></textarea>
                        <ErrorText name="symptoms" />
                    </div>

                    {message && (
                        <p className={`mt-4 text-sm ${hasErrors ? 'text-red-400' : 'text-cyan-300'}`}>
                            {message}
                        </p>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5">
                        <label className="flex cursor-pointer items-center gap-3">
                            <input type="checkbox" checked={simulated}
                                onChange={(e) => handleToggle(e.target.checked)} className="sr-only" />
                            <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${simulated ? 'bg-cyan-400' : 'bg-slate-600'}`}>
                                <span className={`h-5 w-5 rounded-full bg-white transition ${simulated ? 'translate-x-5' : ''}`}></span>
                            </span>
                            <span>
                                <span className="block text-sm font-semibold">Use simulated data</span>
                                <span className="block text-xs text-slate-500">Generates values within safe demo ranges</span>
                            </span>
                        </label>

                        <button type="submit"
                            className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-900 hover:bg-cyan-300">
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
                            All readings in this prototype come from manual entry, generated
                            simulation, or uploaded datasets. No wearables or physical
                            sensors are connected.
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
                            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                                style={{ width: `${completeness}%` }}></div>
                        </div>

                        <p className="mt-5 flex items-center gap-2 text-sm text-slate-400">
                            {inRange ? (
                                <>
                                    <ShieldCheck size={16} className="text-emerald-400" />
                                    Values are within expected ranges
                                </>
                            ) : (
                                <>
                                    <ShieldAlert size={16} className="text-amber-400" />
                                    Check: {outOfRange.map((k) => fieldNames[k]).join(', ')}
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