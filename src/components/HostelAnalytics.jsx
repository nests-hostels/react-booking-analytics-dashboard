import React, { useState, useCallback } from 'react';
import { Upload, TrendingUp, TrendingDown, Calendar, BarChart3, Brain, FileText, AlertCircle, Copy, ChevronDown, ChevronUp, LineChart, FolderOpen, AlertTriangle } from 'lucide-react';
import { LineChart as RechartsLineChart, BarChart as RechartsBarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const HostelAnalytics = () => {
    const [weeklyData, setWeeklyData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState('');
    const [showCharts, setShowCharts] = useState(false);
    const [chartType, setChartType] = useState('line');
    const [pasteData, setPasteData] = useState('');
    const [selectedHostel, setSelectedHostel] = useState('');
    const [inputMethod, setInputMethod] = useState('file');
    const [selectedWeekStart, setSelectedWeekStart] = useState('');
    const [warnings, setWarnings] = useState([]);

    // Updated hostel configuration with correct IDs
    const hostelConfig = {
        'Flamingo': { id: '6733', name: 'Flamingo' },
        'Puerto': { id: '316328', name: 'Puerto' },
        'Arena': { id: '315588', name: 'Arena' },
        'Duque': { id: '316438', name: 'Duque' },
        'Las Palmas': { id: '316428', name: 'Las Palmas' },
        'Aguere': { id: '316437', name: 'Aguere' },
        'Medano': { id: '316440', name: 'Medano' },
        'Los Amigos': { id: '316443', name: 'Los Amigos' },
        'Cisne': { id: '316442', name: 'Cisne' },
        'Ashavana': { id: '316441', name: 'Ashavana' },
        'Las Eras': { id: '316439', name: 'Las Eras' },
    };

    // Extensible date period configuration
    const dateConfig = {
        type: 'week', // Can be changed to 'month', 'custom', etc.
        weekStartDay: 1, // Monday = 1, Sunday = 0
        weekLength: 7 // Days in a week
    };

    // Calculate week boundaries from any date (extensible for future periods)
    const calculatePeriod = (date, config = dateConfig) => {
        const targetDate = new Date(date);

        if (config.type === 'week') {
            // Find Monday of the week containing this date
            const dayOfWeek = targetDate.getDay();
            const diff = dayOfWeek === 0 ? -6 : config.weekStartDay - dayOfWeek; // Handle Sunday

            const weekStart = new Date(targetDate);
            weekStart.setDate(targetDate.getDate() + diff);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + config.weekLength - 1);
            weekEnd.setHours(23, 59, 59, 999);

            return { start: weekStart, end: weekEnd };
        }

        // Future: Add month, custom period calculations here
        return { start: targetDate, end: targetDate };
    };

    // Format period range for display (extensible)
    const formatPeriodRange = (start, end, config = dateConfig) => {
        const formatDate = (date) => {
            const day = date.getDate();
            const month = date.toLocaleDateString('en', { month: 'short' });
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        };

        if (config.type === 'week') {
            return `${formatDate(start)} - ${formatDate(end)}`;
        }

        // Future: Add other period formats here
        return formatDate(start);
    };

    // Helper function to parse Excel dates
    const parseExcelDate = (value) => {
        if (!value) return null;
        if (typeof value === 'number') {
            const date = new Date((value - 25569) * 86400 * 1000);
            return date;
        }
        if (typeof value === 'string') {
            const parts = value.split('/');
            if (parts.length === 3) {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }
        return null;
    };

    // Parse price from string (€17,00 → 17.00)
    const parsePrice = (priceStr) => {
        if (!priceStr) return 0;
        const cleanPrice = priceStr.toString().replace(/[€,]/g, '').replace(',', '.');
        return parseFloat(cleanPrice) || 0;
    };

    // Detect hostel from data
    const detectHostelFromData = (data) => {
        // Try to find hostel ID in URLs first
        for (const [hostelName, config] of Object.entries(hostelConfig)) {
            if (data.includes(config.id)) {
                return hostelName;
            }
        }

        // Try to find hostel name in data
        for (const hostelName of Object.keys(hostelConfig)) {
            if (data.toLowerCase().includes(hostelName.toLowerCase())) {
                return hostelName;
            }
        }

        return null;
    };

    // Auto-detect week from booking dates
    const detectWeekFromBookings = (bookings) => {
        const bookingDates = bookings
            .map(b => parseExcelDate(b.bookingDate))
            .filter(d => d)
            .sort((a, b) => a - b);

        if (bookingDates.length === 0) return null;

        // Use the earliest booking date to determine the week
        const period = calculatePeriod(bookingDates[0]);
        return formatPeriodRange(period.start, period.end);
    };

    // Validate if bookings match selected week
    const validateWeekMatch = (bookings, expectedWeek) => {
        const detectedWeek = detectWeekFromBookings(bookings);
        const newWarnings = [];

        if (detectedWeek && expectedWeek && detectedWeek !== expectedWeek) {
            newWarnings.push(`⚠️ Data appears to be from ${detectedWeek} but you selected ${expectedWeek}`);
        }

        return newWarnings;
    };

    // Parse pasted data (both HTML and text)
    const parsePastedData = (data, hostelName) => {
        const reservations = [];

        try {
            // Try to parse as HTML first
            if (data.includes('<table') || data.includes('<tr')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data, 'text/html');
                const rows = doc.querySelectorAll('tr');

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 10) {
                        const reservation = cells[1]?.textContent?.trim();
                        const bookingDate = cells[4]?.textContent?.trim();
                        const checkin = cells[6]?.textContent?.trim();
                        const checkout = cells[7]?.textContent?.trim();
                        const nights = cells[8]?.textContent?.trim();
                        const price = cells[9]?.textContent?.trim();
                        const status = cells[10]?.textContent?.trim();
                        const source = cells[11]?.textContent?.trim();

                        if (reservation && bookingDate && source?.includes('Sitio web')) {
                            reservations.push({
                                reservation,
                                bookingDate,
                                checkin,
                                checkout,
                                nights: parseInt(nights) || 1,
                                price: parsePrice(price),
                                status,
                                source,
                                leadTime: calculateLeadTime(bookingDate, checkin)
                            });
                        }
                    }
                });
            } else {
                // Parse as plain text
                const lines = data.split('\n').filter(line => line.trim());

                lines.forEach(line => {
                    const cells = line.split('\t');
                    if (cells.length >= 10) {
                        const reservation = cells[1]?.trim();
                        const bookingDate = cells[4]?.trim();
                        const checkin = cells[6]?.trim();
                        const checkout = cells[7]?.trim();
                        const nights = cells[8]?.trim();
                        const price = cells[9]?.trim();
                        const status = cells[10]?.trim();
                        const source = cells[11]?.trim();

                        if (reservation && bookingDate && source?.includes('Sitio web')) {
                            reservations.push({
                                reservation,
                                bookingDate,
                                checkin,
                                checkout,
                                nights: parseInt(nights) || 1,
                                price: parsePrice(price),
                                status,
                                source,
                                leadTime: calculateLeadTime(bookingDate, checkin)
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing pasted data:', error);
        }

        return reservations;
    };

    // Calculate lead time
    const calculateLeadTime = (bookingDate, checkinDate) => {
        const bookDate = parseExcelDate(bookingDate);
        const checkinDateParsed = parseExcelDate(checkinDate);

        if (bookDate && checkinDateParsed) {
            return Math.floor((checkinDateParsed - bookDate) / (1000 * 60 * 60 * 24));
        }
        return null;
    };

    // Process pasted data
    const processPastedData = () => {
        if (!pasteData.trim()) {
            alert('Please paste data');
            return;
        }

        setIsUploading(true);
        setWarnings([]);

        try {
            const detectedHostel = detectHostelFromData(pasteData) || selectedHostel;

            if (!detectedHostel) {
                alert('Could not detect hostel. Please select one from the dropdown.');
                setIsUploading(false);
                return;
            }

            const reservations = parsePastedData(pasteData, detectedHostel);

            if (reservations.length === 0) {
                alert('No valid reservations found in the pasted data');
                setIsUploading(false);
                return;
            }

            // Determine week (user selection or auto-detect)
            let weekRange = '';
            if (selectedWeekStart) {
                const period = calculatePeriod(new Date(selectedWeekStart));
                weekRange = formatPeriodRange(period.start, period.end);
            } else {
                weekRange = detectWeekFromBookings(reservations);
            }

            if (!weekRange) {
                alert('Could not determine week. Please select a week date.');
                setIsUploading(false);
                return;
            }

            // Validate week match
            const weekWarnings = validateWeekMatch(reservations, weekRange);
            setWarnings(weekWarnings);

            // Calculate metrics
            const totalReservations = reservations.length;
            const cancelledReservations = reservations.filter(r => r.status?.toLowerCase().includes('cancel')).length;
            const validReservations = reservations.filter(r => !r.status?.toLowerCase().includes('cancel'));

            const totalRevenue = validReservations.reduce((sum, r) => sum + r.price, 0);
            const totalNights = validReservations.reduce((sum, r) => sum + r.nights, 0);
            const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

            const avgLeadTime = validReservations.filter(r => r.leadTime !== null)
                .reduce((sum, r, _, arr) => sum + r.leadTime / arr.length, 0);

            // Add new week data
            const newWeekData = {
                week: weekRange,
                date: selectedWeekStart ? new Date(selectedWeekStart) : new Date(),
                hostels: {
                    [detectedHostel]: {
                        count: totalReservations,
                        cancelled: cancelledReservations,
                        valid: validReservations.length,
                        adr: adr,
                        avgLeadTime: Math.round(avgLeadTime),
                        bookings: reservations
                    }
                }
            };

            setWeeklyData(prev => {
                // Check if week already exists and merge data
                const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                if (existingWeekIndex >= 0) {
                    const updated = [...prev];
                    updated[existingWeekIndex].hostels[detectedHostel] = newWeekData.hostels[detectedHostel];
                    return sortWeeklyData(updated);
                } else {
                    const updated = [...prev, newWeekData];
                    return sortWeeklyData(updated);
                }
            });

            setPasteData('');
            setSelectedHostel('');
            setSelectedWeekStart('');

        } catch (error) {
            console.error('Error processing pasted data:', error);
            alert(`Error processing data: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Sort weekly data chronologically (oldest to newest)
    const sortWeeklyData = (data) => {
        return [...data].sort((a, b) => a.date - b.date);
    };

    // Process uploaded files (now supports folders)
    const processFiles = async (files) => {
        setIsUploading(true);
        setWarnings([]);
        const fileArray = Array.from(files);
        const weekReservations = {};

        try {
            // Filter for Excel files
            const excelFiles = fileArray.filter(file =>
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );

            if (excelFiles.length === 0) {
                alert('No Excel files found');
                setIsUploading(false);
                return;
            }

            for (const file of excelFiles) {
                const hostelName = file.name.replace('.xlsx', '').replace('.xls', '');

                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Skip header row and process reservations
                const reservations = jsonData.slice(1).filter(row => row.length > 0);

                // Filter for direct bookings
                const directBookings = reservations.filter(row => {
                    const source = row[33];
                    return source && source.includes('Sitio web');
                });

                // Separate cancelled and valid bookings
                const cancelledBookings = directBookings.filter(row => {
                    const status = row[35];
                    return status && status.toLowerCase().includes('cancel');
                });

                const validBookings = directBookings.filter(row => {
                    const status = row[35];
                    return !(status && status.toLowerCase().includes('cancel'));
                });

                // Calculate ADR
                const totalRevenue = validBookings.reduce((sum, row) => sum + (parseFloat(row[27]) || 0), 0);
                const totalNights = validBookings.reduce((sum, row) => sum + (parseInt(row[25]) || 1), 0);
                const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

                weekReservations[hostelName] = {
                    count: directBookings.length,
                    cancelled: cancelledBookings.length,
                    valid: validBookings.length,
                    adr: adr,
                    bookings: directBookings.map(row => ({
                        bookingDate: row[32],
                        arrivalDate: row[23],
                        status: row[35],
                        nights: row[25],
                        price: row[27],
                        leadTime: (() => {
                            const bookDate = parseExcelDate(row[32]);
                            const arrDate = parseExcelDate(row[23]);
                            if (bookDate && arrDate) {
                                return Math.floor((arrDate - bookDate) / (1000 * 60 * 60 * 24));
                            }
                            return null;
                        })()
                    })),
                    avgLeadTime: (() => {
                        const leadTimes = directBookings.map(row => {
                            const bookDate = parseExcelDate(row[32]);
                            const arrDate = parseExcelDate(row[23]);
                            if (bookDate && arrDate) {
                                return Math.floor((arrDate - bookDate) / (1000 * 60 * 60 * 24));
                            }
                            return null;
                        }).filter(lt => lt !== null);

                        return leadTimes.length > 0 ? Math.round(leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length) : 0;
                    })()
                };
            }

            // Determine week (user selection or auto-detect)
            let weekRange = '';
            if (selectedWeekStart) {
                const period = calculatePeriod(new Date(selectedWeekStart));
                weekRange = formatPeriodRange(period.start, period.end);
            } else {
                // Auto-detect from first file's data
                const allBookingDates = Object.values(weekReservations)
                    .flatMap(h => h.bookings.map(b => parseExcelDate(b.bookingDate)))
                    .filter(d => d)
                    .sort((a, b) => a - b);

                if (allBookingDates.length > 0) {
                    const period = calculatePeriod(allBookingDates[0]);
                    weekRange = formatPeriodRange(period.start, period.end);
                }
            }

            if (!weekRange) {
                alert('Could not determine week. Please select a week date.');
                setIsUploading(false);
                return;
            }

            const newWeekData = {
                week: weekRange,
                date: selectedWeekStart ? new Date(selectedWeekStart) : new Date(),
                hostels: weekReservations
            };

            setWeeklyData(prev => {
                // Check if week already exists and merge
                const existingWeekIndex = prev.findIndex(w => w.week === weekRange);
                if (existingWeekIndex >= 0) {
                    const updated = [...prev];
                    updated[existingWeekIndex].hostels = { ...updated[existingWeekIndex].hostels, ...weekReservations };
                    return sortWeeklyData(updated);
                } else {
                    const updated = [...prev, newWeekData];
                    return sortWeeklyData(updated);
                }
            });

            setSelectedWeekStart('');

        } catch (error) {
            console.error('Error processing files:', error);
            alert(`Error processing files: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle file drop (including folders)
    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        const items = e.dataTransfer.items;
        const files = [];

        // Process drag & drop items (supports folders)
        if (items) {
            const promises = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        promises.push(processEntry(entry));
                    }
                }
            }

            const allFiles = await Promise.all(promises);
            const flatFiles = allFiles.flat().filter(file =>
                file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            );

            if (flatFiles.length > 0) {
                processFiles(flatFiles);
            } else {
                alert('No Excel files found in the dropped items');
            }
        } else {
            // Fallback for simple file drag & drop
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processFiles(files);
            }
        }
    }, []);

    // Process file system entries (folders and files)
    const processEntry = async (entry) => {
        if (entry.isFile) {
            return new Promise((resolve) => {
                entry.file(resolve);
            });
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            const entries = await new Promise((resolve) => {
                reader.readEntries(resolve);
            });

            const files = [];
            for (const childEntry of entries) {
                const childFiles = await processEntry(childEntry);
                if (Array.isArray(childFiles)) {
                    files.push(...childFiles);
                } else {
                    files.push(childFiles);
                }
            }
            return files;
        }
        return [];
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    // Handle file/folder input
    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            processFiles(files);
        }
    };

    // Calculate progressive week-over-week changes
    const calculateProgressiveChanges = (currentWeekIndex, hostel) => {
        if (currentWeekIndex === 0) return { change: 0, percentage: 0, isNew: true };

        const currentData = weeklyData[currentWeekIndex];
        const previousData = weeklyData[currentWeekIndex - 1];

        const currentCount = currentData.hostels[hostel]?.count || 0;
        const previousCount = previousData.hostels[hostel]?.count || 0;

        const change = currentCount - previousCount;
        const percentage = previousCount === 0 ? (currentCount > 0 ? 100 : 0) : Math.round((change / previousCount) * 100);

        return { change, percentage, isNew: false };
    };

    // Get AI analysis
    const getAIAnalysis = async () => {
        if (weeklyData.length === 0) return;

        setIsAnalyzing(true);

        try {
            const prompt = `Analyze this hostel reservation data and provide insights on performance trends and reasons for changes:

${JSON.stringify(weeklyData, null, 2)}

Please provide:
1. Key performance insights
2. Trends by hostel
3. Possible reasons for week-over-week changes
4. Recommendations for improvement
5. Notable patterns in booking behavior and ADR

Format your response in a clear, actionable report.`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await response.json();
            const analysis = data.content[0].text;
            setAnalysisReport(analysis);

        } catch (error) {
            console.error('Error getting AI analysis:', error);
            setAnalysisReport('Sorry, there was an error generating the analysis. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Get all unique hostels
    const getAllHostels = () => {
        const hostelSet = new Set();
        weeklyData.forEach(week => {
            Object.keys(week.hostels).forEach(hostel => hostelSet.add(hostel));
        });
        return Array.from(hostelSet).sort();
    };

    // Prepare chart data
    const prepareChartData = () => {
        const allHostels = getAllHostels();

        return weeklyData.map(week => {
            const dataPoint = { week: week.week };
            allHostels.forEach(hostel => {
                dataPoint[hostel] = week.hostels[hostel]?.count || 0;
            });
            return dataPoint;
        });
    };

    const allHostels = getAllHostels();
    const chartData = prepareChartData();
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                        <BarChart3 className="text-blue-600" />
                        Hostel Analytics Dashboard
                    </h1>
                    <p className="text-gray-600 text-lg">Track weekly direct bookings and analyze performance trends</p>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-semibold text-yellow-800">Warnings</h3>
                        </div>
                        {warnings.map((warning, index) => (
                            <p key={index} className="text-yellow-700 text-sm">{warning}</p>
                        ))}
                    </div>
                )}

                {/* Input Method Toggle */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <button
                            onClick={() => setInputMethod('file')}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${inputMethod === 'file'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <FolderOpen className="w-4 h-4 inline mr-2" />
                            Upload Files/Folders
                        </button>
                        <button
                            onClick={() => setInputMethod('paste')}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${inputMethod === 'paste'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <Copy className="w-4 h-4 inline mr-2" />
                            Copy & Paste
                        </button>
                    </div>

                    {/* Week Selection */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Week (optional - will auto-detect if not specified)
                        </label>
                        <input
                            type="date"
                            value={selectedWeekStart}
                            onChange={(e) => setSelectedWeekStart(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {selectedWeekStart && (
                            <p className="text-sm text-gray-600 mt-2">
                                Week: {formatPeriodRange(...Object.values(calculatePeriod(new Date(selectedWeekStart))))}
                            </p>
                        )}
                    </div>

                    {/* File Upload Section */}
                    {inputMethod === 'file' && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <FolderOpen className="text-blue-600" />
                                Upload Weekly Data
                            </h2>

                            <div
                                className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => document.getElementById('fileInput').click()}
                            >
                                <div className="flex flex-col items-center gap-4">
                                    <FileText className="w-16 h-16 text-blue-500" />
                                    <div>
                                        <p className="text-xl font-semibold text-gray-700 mb-2">
                                            Drop Excel files or folders here
                                        </p>
                                        <p className="text-gray-500 mb-4">
                                            Upload individual Excel files or entire folders with multiple hostel data
                                        </p>
                                        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                                            <p>✅ Single files: Flamingo.xlsx, Puerto.xlsx, etc.</p>
                                            <p>✅ Folders: Upload entire week folder with all Excel files</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                            Select Files
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                document.getElementById('folderInput').click();
                                            }}
                                            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                                        >
                                            Select Folder
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <input
                                type="file"
                                id="fileInput"
                                multiple
                                accept=".xlsx,.xls"
                                onChange={handleFileInput}
                                className="hidden"
                            />

                            <input
                                type="file"
                                id="folderInput"
                                webkitdirectory="true"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Copy-Paste Section */}
                    {inputMethod === 'paste' && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Copy className="text-blue-600" />
                                Copy & Paste Data
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Hostel (optional - auto-detection available)
                                    </label>
                                    <select
                                        value={selectedHostel}
                                        onChange={(e) => setSelectedHostel(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Auto-detect from data</option>
                                        {Object.entries(hostelConfig).map(([name, config]) => (
                                            <option key={name} value={name}>{name} (ID: {config.id})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Paste CloudBeds Table Data (HTML or Text)
                                    </label>
                                    <textarea
                                        value={pasteData}
                                        onChange={(e) => setPasteData(e.target.value)}
                                        placeholder="Paste your CloudBeds reservation table here (either HTML or tab-separated text)..."
                                        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                    />
                                </div>

                                <button
                                    onClick={processPastedData}
                                    disabled={!pasteData.trim() || isUploading}
                                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isUploading ? 'Processing...' : 'Process Data'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="mt-4 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Processing data...</p>
                        </div>
                    )}
                </div>

                {/* Current Week Summary - Responsive Grid */}
                {weeklyData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Calendar className="text-green-600" />
                            Latest Week: {weeklyData[weeklyData.length - 1]?.week}
                        </h2>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {Object.entries(weeklyData[weeklyData.length - 1]?.hostels || {}).map(([hostel, data]) => (
                                <div key={hostel} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
                                    <h3 className="font-bold text-lg text-gray-800 mb-2 truncate">{hostel}</h3>
                                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{data.count}</div>
                                    <div className="text-xs sm:text-sm text-gray-600 mb-3">Total reservations</div>

                                    {data.cancelled > 0 && (
                                        <div className="text-xs text-red-600 mb-2">
                                            {data.cancelled} cancelled
                                        </div>
                                    )}

                                    <div className="space-y-1 text-xs text-gray-500">
                                        <div>ADR: €{data.adr?.toFixed(2) || '0.00'}</div>
                                        <div>Lead time: {data.avgLeadTime || 0} days</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weekly Comparison Table */}
                {weeklyData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="text-purple-600" />
                                Weekly Performance Comparison
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCharts(!showCharts)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <LineChart className="w-4 h-4" />
                                    {showCharts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    Charts
                                </button>
                                <button
                                    onClick={getAIAnalysis}
                                    disabled={isAnalyzing}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Brain className="w-4 h-4" />
                                    {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                                </button>
                            </div>
                        </div>

                        {/* Charts Section */}
                        {showCharts && chartData.length > 0 && (
                            <div className="mb-8 p-6 bg-gray-50 rounded-xl">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Reservation Trends (Chronological)</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setChartType('line')}
                                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            Line Chart
                                        </button>
                                        <button
                                            onClick={() => setChartType('bar')}
                                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            Bar Chart
                                        </button>
                                    </div>
                                </div>

                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'line' ? (
                                            <RechartsLineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                {allHostels.map((hostel, index) => (
                                                    <Line
                                                        key={hostel}
                                                        type="monotone"
                                                        dataKey={hostel}
                                                        stroke={colors[index % colors.length]}
                                                        strokeWidth={2}
                                                        dot={{ r: 4 }}
                                                    />
                                                ))}
                                            </RechartsLineChart>
                                        ) : (
                                            <RechartsBarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                {allHostels.map((hostel, index) => (
                                                    <Bar
                                                        key={hostel}
                                                        dataKey={hostel}
                                                        fill={colors[index % colors.length]}
                                                    />
                                                ))}
                                            </RechartsBarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-4 px-2 sm:px-4 font-bold text-gray-800">Hostel</th>
                                        {weeklyData.map(week => (
                                            <th key={week.week} className="text-center py-4 px-2 sm:px-4 font-bold text-gray-800 min-w-32">
                                                <div className="text-sm">{week.week}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allHostels.map(hostel => (
                                        <tr key={hostel} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-2 sm:px-4 font-semibold text-gray-700">
                                                {hostel}
                                            </td>
                                            {weeklyData.map((week, weekIndex) => {
                                                const hostelData = week.hostels[hostel];
                                                const currentCount = hostelData?.count || 0;
                                                const cancelledCount = hostelData?.cancelled || 0;

                                                const changes = calculateProgressiveChanges(weekIndex, hostel);

                                                return (
                                                    <td key={week.week} className="py-4 px-2 sm:px-4 text-center">
                                                        <div className="text-xl font-bold text-gray-800">
                                                            {currentCount}
                                                        </div>
                                                        {cancelledCount > 0 && (
                                                            <div className="text-xs text-red-600">
                                                                ({cancelledCount} cancelled)
                                                            </div>
                                                        )}
                                                        {!changes.isNew && (
                                                            <div className={`text-sm flex items-center justify-center gap-1 ${changes.change > 0 ? 'text-green-600' :
                                                                changes.change < 0 ? 'text-red-600' : 'text-gray-500'
                                                                }`}>
                                                                {changes.change > 0 ? (
                                                                    <TrendingUp className="w-3 h-3" />
                                                                ) : changes.change < 0 ? (
                                                                    <TrendingDown className="w-3 h-3" />
                                                                ) : null}
                                                                {changes.change !== 0 && (
                                                                    <span className="text-xs">
                                                                        {changes.change > 0 ? '+' : ''}{changes.change} ({changes.percentage}%)
                                                                    </span>
                                                                )}
                                                                {changes.change === 0 && <span className="text-xs">No change</span>}
                                                            </div>
                                                        )}
                                                        {changes.isNew && (
                                                            <div className="text-sm text-blue-600">First Week</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}

                                    {/* Totals Row */}
                                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                                        <td className="py-4 px-2 sm:px-4 font-bold text-gray-800">
                                            TOTAL
                                        </td>
                                        {weeklyData.map((week, weekIndex) => {
                                            const totalReservations = Object.values(week.hostels).reduce((sum, h) => sum + h.count, 0);
                                            const totalCancelled = Object.values(week.hostels).reduce((sum, h) => sum + (h.cancelled || 0), 0);

                                            // Calculate progressive total changes
                                            const previousTotal = weekIndex > 0
                                                ? Object.values(weeklyData[weekIndex - 1].hostels).reduce((sum, h) => sum + h.count, 0)
                                                : 0;
                                            const totalChange = weekIndex > 0 ? totalReservations - previousTotal : 0;
                                            const totalPercentage = weekIndex > 0 && previousTotal > 0
                                                ? Math.round((totalChange / previousTotal) * 100)
                                                : 0;

                                            return (
                                                <td key={week.week} className="py-4 px-2 sm:px-4 text-center">
                                                    <div className="text-xl font-bold text-gray-800">
                                                        {totalReservations}
                                                    </div>
                                                    {totalCancelled > 0 && (
                                                        <div className="text-xs text-red-600">
                                                            ({totalCancelled} cancelled)
                                                        </div>
                                                    )}
                                                    {weekIndex > 0 && (
                                                        <div className={`text-sm flex items-center justify-center gap-1 ${totalChange > 0 ? 'text-green-600' :
                                                            totalChange < 0 ? 'text-red-600' : 'text-gray-500'
                                                            }`}>
                                                            {totalChange > 0 ? (
                                                                <TrendingUp className="w-3 h-3" />
                                                            ) : totalChange < 0 ? (
                                                                <TrendingDown className="w-3 h-3" />
                                                            ) : null}
                                                            {totalChange !== 0 && (
                                                                <span className="text-xs">
                                                                    {totalChange > 0 ? '+' : ''}{totalChange} ({totalPercentage}%)
                                                                </span>
                                                            )}
                                                            {totalChange === 0 && <span className="text-xs">No change</span>}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* AI Analysis Report */}
                {analysisReport && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Brain className="text-indigo-600" />
                            AI Performance Analysis
                        </h2>
                        <div className="prose max-w-none">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                                <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
                                    {analysisReport}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {weeklyData.length === 0 && (
                    <div className="text-center py-12">
                        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No data yet</h3>
                        <p className="text-gray-500">Upload files/folders or paste data to start analyzing your hostel performance</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostelAnalytics;