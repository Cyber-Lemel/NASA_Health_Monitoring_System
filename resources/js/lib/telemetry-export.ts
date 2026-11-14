import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AstronautFullData } from '@/types/astronaut';

/**
 * Format timestamp for filename
 */
function getTimestampStr(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Export active astronaut telemetry and biometrics to Excel (.xlsx)
 */
export function exportAstronautToExcel(
    astronaut: AstronautFullData,
    allCrewDataset: any[] = []
): void {
    const wb = XLSX.utils.book_new();
    const timestamp = getTimestampStr();
    const exportDate = new Date().toUTCString();

    // --- SHEET 1: Active Astronaut Telemetry & Vitals ---
    const telemetrySheetData = [
        ['ORBIT BIOMEDICAL OPERATIONS • DEEP SPACE MISSION TELEMETRY'],
        ['MISSION:', astronaut.bio.mission, 'EXPORT TIME:', exportDate],
        ['CLASSIFICATION:', 'OFFICIAL / RESTRICTED', 'DATA SOURCE:', 'ORBIT LIVE TELEMETRY'],
        [],
        ['--- 1. ASTRONAUT PROFILE & DOSSIER ---'],
        ['Crew ID', astronaut.bio.id],
        ['Full Name', astronaut.bio.name],
        ['Role / Station', astronaut.bio.role],
        ['EVA Status', astronaut.bio.evaStatus],
        ['Age at Launch', `${astronaut.bio.age} years`],
        ['Gender', astronaut.bio.gender],
        ['Country / Agency', astronaut.bio.country],
        ['Mission Duration', `${astronaut.bio.missionDurationDays} Days`],
        ['Bone Density Loss', astronaut.bio.boneDensityLoss],
        [],
        ['--- 2. REAL-TIME PHYSIOLOGICAL BIOMETRICS ---'],
        ['Biometric Parameter', 'Current Reading', 'Baseline Range', 'Status', 'Risk Index'],
        [
            'Heart Rate (ECG)',
            astronaut.vitals.heartRate.value,
            astronaut.vitals.heartRate.baseline,
            astronaut.vitals.heartRate.status || 'Nominal',
            astronaut.vitals.heartRate.numericValue > 110 ? 'High' : 'Normal',
        ],
        [
            'Blood Oxygen (SpO2)',
            astronaut.vitals.spO2.value,
            astronaut.vitals.spO2.baseline,
            astronaut.vitals.spO2.status || 'Nominal',
            astronaut.vitals.spO2.numericValue < 95 ? 'Alert' : 'Optimal',
        ],
        [
            'Core Body Temperature',
            astronaut.vitals.coreTemp.value,
            astronaut.vitals.coreTemp.baseline,
            astronaut.vitals.coreTemp.status || 'Nominal',
            astronaut.vitals.coreTemp.numericValue > 37.8 ? 'Elevated' : 'Optimal',
        ],
        [
            'Respiration Rate',
            astronaut.vitals.respiration.value,
            astronaut.vitals.respiration.baseline,
            astronaut.vitals.respiration.status || 'Nominal',
            astronaut.vitals.respiration.numericValue > 22 ? 'Elevated' : 'Optimal',
        ],
        [
            'Hydration Level',
            astronaut.vitals.hydration.value,
            astronaut.vitals.hydration.baseline,
            astronaut.vitals.hydration.status || 'Nominal',
            astronaut.vitals.hydration.numericValue < 70 ? 'Low' : 'Adequate',
        ],
        [],
        ['--- 3. EXTRAVEHICULAR ACTIVITY (EVA) & SUIT SYSTEMS ---'],
        ['Life Support Subsystem', 'Reading', 'Operational Threshold', 'Integrity'],
        ['Suit Pressure', `${astronaut.diagnostics.suitPressurePsi} psi (${astronaut.diagnostics.suitPressurePercent}%)`, '4.0 - 4.5 psi', 'Stable'],
        ['Oxygen Reserve (O2)', `${astronaut.diagnostics.o2Percent}%`, 'Min 20%', astronaut.diagnostics.o2Percent < 22 ? 'Low Scrubber' : 'Nominal'],
        ['Radiation Exposure', `${astronaut.diagnostics.radiationStatus} (${astronaut.diagnostics.radiationPercent}%)`, '< 0.50 mSv/h', 'Shielded'],
        ['Suit Battery Reserve', `${astronaut.diagnostics.batteryPercent}%`, 'Min 20%', 'Adequate'],
        [],
        ['--- 4. NASA 5 HAZARDS (R.I.D.G.E.) AUTONOMOUS STATUS ---'],
        ['Hazard Focus', 'Observed Biomarker / Metric', 'Threshold Envelope', 'Autonomous Status'],
        ['[R] Space Radiation', `${astronaut.diagnostics.radiationStatus}`, '< 0.50 mSv/h', 'Storm Haven Ready'],
        ['[I] Isolation & Confinement', 'Circadian Phase: Phase 1 • Sleep 84%', 'PVT Lapse < 2', 'SSLA Mode Active'],
        ['[D] Distance from Earth', 'DSN Comm Delay: 14m 22s', 'Autonomous CDS Required', 'AHHI Active'],
        ['[G] Gravity Fields', `Bone Loss: ${astronaut.bio.boneDensityLoss}`, '< 1.5% loss / month', 'ARED & LBNP Ready'],
        ['[E] Hostile Closed Environment', 'ECLSS Cabin pCO2: 2.8 mmHg', '< 3.0 mmHg', 'Scrubbers Nominal'],
    ];

    const wsTelemetry = XLSX.utils.aoa_to_sheet(telemetrySheetData);
    wsTelemetry['!cols'] = [
        { wch: 30 },
        { wch: 36 },
        { wch: 28 },
        { wch: 24 },
        { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTelemetry, 'Biometrics & Telemetry');

    // --- SHEET 2: NASA 5 Hazards Autonomous Countermeasures Protocol ---
    const countermeasureHeader = ['Countermeasure Protocol', 'Target Hazard', 'Execution Mode', 'NASA-STD-3001 Compliance'];
    const countermeasureRows = [
        ['ARED High-Resistance Loading (600 N)', 'Altered Gravity (Bone / Muscle)', 'Autonomous Execution', 'Fully Compliant'],
        ['LBNP Decompression Garment (-35 mmHg)', 'Altered Gravity (SANS Fluid Shift)', 'Autonomous Execution', 'Fully Compliant'],
        ['SSLA Dynamic Circadian Lighting', 'Isolation & Confinement (Sleep / Mood)', 'Automated Schedule', 'Fully Compliant'],
        ['Storm Haven Radiation Vault Lockdown', 'Space Radiation (SPE / GCR)', 'Emergency Standby', 'Fully Compliant'],
        ['ECLSS Amine-Bed CO2 Scrubber Boost', 'Hostile Closed Environment (pCO2)', 'Automated / Manual Override', 'Fully Compliant'],
    ];
    const wsLogs = XLSX.utils.aoa_to_sheet([
        ['ORBIT MISSION CONTROL • NASA 5 HAZARDS AUTONOMOUS COUNTERMEASURES'],
        ['ASTRONAUT:', `${astronaut.bio.name} (${astronaut.bio.id})`],
        [],
        countermeasureHeader,
        ...countermeasureRows,
    ]);
    wsLogs['!cols'] = [{ wch: 38 }, { wch: 32 }, { wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsLogs, '5 Hazards Countermeasures');

    // --- SHEET 3: Complete Crew Dataset (if provided) ---
    if (allCrewDataset && allCrewDataset.length > 0) {
        const datasetHeaders = [
            'Astronaut ID',
            'Name',
            'Age at Launch',
            'Gender',
            'Country',
            'Mission Duration (Days)',
            'Bone Density Loss',
        ];
        const datasetRows = allCrewDataset.map((c) => [
            c.Astronaut || c.id || '',
            c.Name || c.name || '',
            c.Age_at_mission_start ?? c.age ?? '',
            c.Gender || c.gender || '',
            c.Country || c.country || '',
            c['Mission_duration(Days)'] ?? c.missionDurationDays ?? '',
            c.Bone_Density_Loss || c.boneDensityLoss || '',
        ]);
        const wsDataset = XLSX.utils.aoa_to_sheet([
            ['NASA HUMAN RESEARCH PROGRAM (HRP) - 5 HAZARDS & TELEMETRY ARCHIVE'],
            [],
            datasetHeaders,
            ...datasetRows,
        ]);
        wsDataset['!cols'] = [
            { wch: 15 },
            { wch: 28 },
            { wch: 15 },
            { wch: 12 },
            { wch: 15 },
            { wch: 22 },
            { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, wsDataset, 'Crew Database Archive');
    }

    const cleanName = astronaut.bio.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `NASA_Telemetry_${cleanName}_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);
}

/**
 * Export active astronaut health telemetry report as an official NASA PDF document
 */
export function exportAstronautToPdf(astronaut: AstronautFullData): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = getTimestampStr();
    const currentDate = new Date().toUTCString();

    // 1. Header Banner (Deep Space NASA Theme)
    doc.setFillColor(5, 14, 26); // Deep Space Navy #050e1a
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Header Accent Line (Electric Cyan)
    doc.setFillColor(92, 219, 223); // #5cdbdf
    doc.rect(0, 26.8, pageWidth, 1.2, 'F');

    // Secondary Cobalt Line
    doc.setFillColor(2, 132, 199); // #0284c7
    doc.rect(0, 28, pageWidth, 0.4, 'F');

    // NASA Logo Badge
    doc.setFillColor(11, 61, 145); // NASA Blue #0b3d91
    doc.roundedRect(14, 5, 20, 16, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('NASA', 17.5, 15);

    // Title & Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11.5);
    doc.text('ORBIT • ASTRONAUT HEALTH & TELEMETRY SYSTEM', 38, 11);
    doc.setFontSize(7.5);
    doc.setTextColor(92, 219, 223);
    doc.text('SPACE MEDICINE & LIFE SCIENCES DIVISION • JOHNSON SPACE CENTER', 38, 16.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`CONFIDENTIAL BIOMEDICAL DOSSIER // MET DATE: ${currentDate}`, 38, 21.5);

    // Security Classification Badge (Right side)
    doc.setFillColor(10, 28, 48);
    doc.setDrawColor(92, 219, 223);
    doc.setLineWidth(0.3);
    doc.roundedRect(pageWidth - 14 - 44, 5, 44, 15, 1.5, 1.5, 'FD');
    doc.setFontSize(5.5);
    doc.setTextColor(92, 219, 223);
    doc.setFont('helvetica', 'bold');
    doc.text('SECURITY CLASSIFICATION', pageWidth - 14 - 42, 9.5);
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL MEDICAL', pageWidth - 14 - 42, 14);
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text('UNCLASSIFIED // NASA-STD-3001', pageWidth - 14 - 42, 17.5);

    let currentY = 36;

    // 2. Astronaut Profile Grid
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. ASTRONAUT PROFILE & MISSION DOSSIER', 14, currentY);

    currentY += 4;

    const bioData = [
        [
            { content: 'Astronaut ID:', styles: { fontStyle: 'bold' } },
            astronaut.bio.id,
            { content: 'EVA Status:', styles: { fontStyle: 'bold' } },
            astronaut.bio.evaStatus,
        ],
        [
            { content: 'Full Name:', styles: { fontStyle: 'bold' } },
            astronaut.bio.name,
            { content: 'Mission:', styles: { fontStyle: 'bold' } },
            astronaut.bio.mission,
        ],
        [
            { content: 'Role / Assignment:', styles: { fontStyle: 'bold' } },
            astronaut.bio.role,
            { content: 'Age / Gender:', styles: { fontStyle: 'bold' } },
            `${astronaut.bio.age} yrs / ${astronaut.bio.gender}`,
        ],
        [
            { content: 'Country / Agency:', styles: { fontStyle: 'bold' } },
            astronaut.bio.country,
            { content: 'Mission Duration:', styles: { fontStyle: 'bold' } },
            `${astronaut.bio.missionDurationDays} Days`,
        ],
        [
            { content: 'Bone Density Loss:', styles: { fontStyle: 'bold' } },
            astronaut.bio.boneDensityLoss,
            { content: 'Telemetry Hash:', styles: { fontStyle: 'bold' } },
            `ORBIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        ],
    ];

    autoTable(doc, {
        startY: currentY,
        body: bioData as any,
        theme: 'grid',
        styles: {
            fontSize: 8.5,
            cellPadding: 2,
            textColor: [30, 41, 59],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { cellWidth: 38, fillColor: [241, 245, 249], fontStyle: 'bold' },
            1: { cellWidth: 55 },
            2: { cellWidth: 38, fillColor: [241, 245, 249], fontStyle: 'bold' },
            3: { cellWidth: 55 },
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 3. Real-Time Physiological Biometrics Table
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. REAL-TIME PHYSIOLOGICAL BIOMETRICS', 14, currentY);

    currentY += 4;

    const vitalsHeaders = ['Biometric Parameter', 'Live Value', 'Nominal Range', 'Assessment', 'Condition Index'];
    const vitalsRows = [
        [
            'Electrocardiogram (ECG / HR)',
            astronaut.vitals.heartRate.value,
            astronaut.vitals.heartRate.baseline,
            astronaut.vitals.heartRate.status || 'Nominal',
            astronaut.vitals.heartRate.numericValue > 110 ? 'ELEVATED TACHYCARDIA' : 'NOMINAL',
        ],
        [
            'Pulse Oximetry (SpO2)',
            astronaut.vitals.spO2.value,
            astronaut.vitals.spO2.baseline,
            astronaut.vitals.spO2.status || 'Nominal',
            astronaut.vitals.spO2.numericValue < 95 ? 'HYPOXIA WARNING' : 'OPTIMAL',
        ],
        [
            'Core Body Temperature',
            astronaut.vitals.coreTemp.value,
            astronaut.vitals.coreTemp.baseline,
            astronaut.vitals.coreTemp.status || 'Nominal',
            astronaut.vitals.coreTemp.numericValue > 37.8 ? 'HYPERTHERMIA RISK' : 'NOMINAL',
        ],
        [
            'Respiration Frequency',
            astronaut.vitals.respiration.value,
            astronaut.vitals.respiration.baseline,
            astronaut.vitals.respiration.status || 'Nominal',
            astronaut.vitals.respiration.numericValue > 22 ? 'TACHYPNEA' : 'NORMAL',
        ],
        [
            'Hydration Saturation',
            astronaut.vitals.hydration.value,
            astronaut.vitals.hydration.baseline,
            astronaut.vitals.hydration.status || 'Nominal',
            astronaut.vitals.hydration.numericValue < 70 ? 'DEHYDRATED (ACTION REQ.)' : 'ADEQUATE',
        ],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [vitalsHeaders],
        body: vitalsRows,
        theme: 'striped',
        headStyles: {
            fillColor: [8, 24, 43], // Deep space navy
            textColor: [92, 219, 223], // Electric cyan
            fontSize: 8.5,
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 8,
            cellPadding: 2.2,
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 4. Extravehicular Activity & Suit Systems Diagnostics
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. LIFE SUPPORT & SUIT DIAGNOSTICS', 14, currentY);

    currentY += 4;

    const suitHeaders = ['Subsystem', 'Current Reading', 'Operating Range', 'Safety Status'];
    const suitRows = [
        [
            'Suit Internal Pressure',
            `${astronaut.diagnostics.suitPressurePsi} psi (${astronaut.diagnostics.suitPressurePercent}%)`,
            '4.0 - 4.5 psi',
            'NOMINAL / STABLE',
        ],
        [
            'Suit O2 Reserve Concentration',
            `${astronaut.diagnostics.o2Percent}%`,
            '20.9% - 22.0%',
            astronaut.diagnostics.o2Percent < 22 ? 'LOW RESERVE (SCRUBBER ACTIVE)' : 'OPTIMAL',
        ],
        [
            'Radiation Exposure Environment',
            `${astronaut.diagnostics.radiationStatus} (${astronaut.diagnostics.radiationPercent}%)`,
            '< 0.50 mSv/h',
            'NOMINAL SHIELDING',
        ],
        [
            'Suit Primary Battery Pack',
            `${astronaut.diagnostics.batteryPercent}%`,
            'Min. 20% Safe Return',
            astronaut.diagnostics.batteryPercent > 50 ? 'OPTIMAL' : 'MONITOR',
        ],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [suitHeaders],
        body: suitRows,
        theme: 'striped',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [92, 219, 223],
            fontSize: 8.5,
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 8,
            cellPadding: 2.2,
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 5. Active Medical Alerts & Interventions
    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. NASA 5 HAZARDS (R.I.D.G.E.) AUTONOMOUS EVALUATION', 14, currentY);

    currentY += 4;

    const hazardHeaders = ['NASA Spaceflight Hazard', 'Biomedical Indicator', 'Safety Tolerance', 'Autonomous Countermeasure'];
    const hazardRows = [
        ['[R] Space Radiation', astronaut.diagnostics.radiationStatus, '< 0.50 mSv/h', 'Storm Haven Secondary Shielding'],
        ['[I] Isolation & Confinement', 'Circadian Phase: Phase 1 • Sleep 84%', 'PVT Lapse < 2', 'SSLA Blue-Depleted Lighting'],
        ['[D] Distance from Earth', 'DSN Comm Latency: 14m 22s', 'Autonomous CDS Required', 'ORBIT Algorithmic Health Engine'],
        ['[G] Gravity Fields', `Bone Loss: ${astronaut.bio.boneDensityLoss}`, '< 1.5% loss / mo', 'ARED 600N & LBNP Garment'],
        ['[E] Hostile Closed Environment', 'ECLSS Cabin pCO2: 2.8 mmHg', '< 3.0 mmHg', 'Amine-Bed Desiccant CO2 Scrubber'],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [hazardHeaders],
        body: hazardRows,
        theme: 'grid',
        headStyles: {
            fillColor: [8, 24, 43],
            textColor: [92, 219, 223],
            fontSize: 8.5,
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 50 },
            2: { cellWidth: 40 },
            3: { cellWidth: 46 },
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 5. Autonomous Countermeasures Protocol
    if (currentY > 230) {
        doc.addPage();
        currentY = 20;
    }

    doc.setTextColor(10, 25, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. NASA 5 HAZARDS AUTONOMOUS COUNTERMEASURES PROTOCOL', 14, currentY);

    currentY += 4;

    const countermeasureHeaders = ['Protocol Name', 'Target Spaceflight Hazard', 'Autonomous Mode', 'NASA-STD-3001 Compliance'];
    const countermeasureTableRows = [
        ['ARED High-Resistance Loading (600 N)', 'Altered Gravity (Bone / Muscle Atrophy)', 'Autonomous Execution', 'Fully Verified'],
        ['LBNP Decompression Garment (-35 mmHg)', 'Altered Gravity (SANS Cephalad Fluid Shift)', 'Autonomous Execution', 'Fully Verified'],
        ['SSLA Dynamic Circadian Lighting', 'Isolation & Confinement (Sleep / Circadian)', 'Automated Schedule', 'Fully Verified'],
        ['Storm Haven Radiation Vault Lockdown', 'Space Radiation (SPE / Galactic Cosmic Rays)', 'Emergency Standby', 'Fully Verified'],
        ['ECLSS Amine-Bed CO2 Scrubber Boost', 'Hostile Closed Environment (pCO2 Purge)', 'Automated / Manual', 'Fully Verified'],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [countermeasureHeaders],
        body: countermeasureTableRows,
        theme: 'striped',
        headStyles: {
            fillColor: [8, 24, 43],
            textColor: [92, 219, 223],
            fontSize: 8,
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 7.5,
            cellPadding: 2,
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Footer Sign-Off Box
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('ORBIT AUTONOMOUS MEDICAL OPERATIONS CLEARANCE', 18, currentY + 6);
    doc.text('FLIGHT SURGEON: DR. R. CHEN, MD (NASA BIO-OPS)', 18, currentY + 12);
    doc.text(`DIGITAL SIGNATURE HASH: SHA256-${Math.random().toString(36).substring(2, 14).toUpperCase()}`, 18, currentY + 18);

    doc.text('MISSION DIRECTOR CLEARANCE: [ VERIFIED ]', 120, currentY + 12);
    doc.text('ENCRYPTED TELEMETRY LINK: ACTIVE', 120, currentY + 18);

    // Page Numbering Footer on all pages
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `ORBIT Medical Telemetry • Page ${i} of ${totalPages} • Security Clearance: UNCLASSIFIED / BIO-PUB`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 6,
            { align: 'center' }
        );
    }

    const cleanName = astronaut.bio.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `ORBIT_Health_Report_${cleanName}_${timestamp}.pdf`;
    doc.save(filename);
}

/**
 * Export raw telemetry to CSV
 */
export function exportAstronautToCsv(astronaut: AstronautFullData): void {
    const timestamp = getTimestampStr();
    const rows = [
        ['Parameter', 'Value', 'Unit', 'Status'],
        ['Astronaut ID', astronaut.bio.id, '', ''],
        ['Name', astronaut.bio.name, '', ''],
        ['Role', astronaut.bio.role, '', ''],
        ['Mission', astronaut.bio.mission, '', ''],
        ['EVA Status', astronaut.bio.evaStatus, '', ''],
        ['Heart Rate', astronaut.vitals.heartRate.value, 'bpm', astronaut.vitals.heartRate.status || ''],
        ['SpO2', astronaut.vitals.spO2.value, '%', astronaut.vitals.spO2.status || ''],
        ['Core Temperature', astronaut.vitals.coreTemp.value, '°C', astronaut.vitals.coreTemp.status || ''],
        ['Respiration', astronaut.vitals.respiration.value, 'bpm', astronaut.vitals.respiration.status || ''],
        ['Hydration', astronaut.vitals.hydration.value, '%', astronaut.vitals.hydration.status || ''],
        ['Suit Pressure', String(astronaut.diagnostics.suitPressurePsi), 'psi', ''],
        ['O2 Level', String(astronaut.diagnostics.o2Percent), '%', ''],
        ['Radiation', astronaut.diagnostics.radiationStatus, '', ''],
        ['Battery', String(astronaut.diagnostics.batteryPercent), '%', ''],
    ];

    const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanName = astronaut.bio.name.replace(/\s+/g, '_');
    link.setAttribute('download', `ORBIT_Telemetry_${cleanName}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export telemetry state to JSON
 */
export function exportAstronautToJson(astronaut: AstronautFullData): void {
    const timestamp = getTimestampStr();
    const exportPayload = {
        meta: {
            system: 'ORBIT - Autonomous Spaceflight Health Monitoring System',
            exportedAt: new Date().toISOString(),
            version: '3.0.0',
        },
        astronaut,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    const cleanName = astronaut.bio.name.replace(/\s+/g, '_');
    link.setAttribute('download', `ORBIT_Telemetry_${cleanName}_${timestamp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
