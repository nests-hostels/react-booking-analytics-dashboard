import React, { useState, useCallback } from 'react';
import { Upload, TrendingUp, TrendingDown, Calendar, BarChart3, Brain, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const HostelAnalytics = () => {
    const [weeklyData, setWeeklyData] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState('');
    const [currentWeek, setCurrentWeek] = useState('');

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

    // Process uploaded files
    const processFiles = async (files) => {
        setIsUploading(true);
        const fileArray = Array.from(files);
        const weekReservations = {};

        try {
            for (const file of fileArray) {
                const hostelName = file.name.replace('.xlsx', '').replace('.xls', '');

                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Skip header row and process reservations
                const reservations = jsonData.slice(1).filter(row => row.length > 0);

                // Filter for direct bookings and valid data
                const directBookings = reservations.filter(row => {
                    const source = row[33]; // "Fuente"
                    const status = row[35]; // "Estado"
                    return source && source.includes('Sitio web') && status && status !== 'Cancelado';
                });

                weekReservations[hostelName] = {
                    count: directBookings.length,
                    bookings: directBookings.map(row => ({
                        bookingDate: row[32],
                        arrivalDate: row[23],
                        status: row[35],
                        nights: row[25],
                        leadTime: (() => {
                            const bookDate = parseExcelDate(row[32]);
                            const arrDate = parseExcelDate(row[23]);
                            if (bookDate && arrDate) {
                                return Math.floor((arrDate - bookDate) / (1000 * 60 * 60 * 24));
                            }
                            return null;
                        })()
                    }))
                };
            }

            // Generate week range from first booking date
            const allBookingDates = Object.values(weekReservations)
                .flatMap(h => h.bookings.map(b => parseExcelDate(b.bookingDate)))
                .filter(d => d)
                .sort((a, b) => a - b);

            if (allBookingDates.length > 0) {
                const startDate = allBookingDates[0];
                const endDate = allBookingDates[allBookingDates.length - 1];

                const formatDate = (date) => {
                    const day = date.getDate();
                    const month = date.toLocaleDateString('en', { month: 'short' });
                    const year = date.getFullYear();
                    return `${day} ${month} ${year}`;
                };

                const weekRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
                setCurrentWeek(weekRange);

                // Add new week data
                const newWeekData = {
                    week: weekRange,
                    date: new Date(),
                    hostels: weekReservations
                };

                setWeeklyData(prev => {
                    const updated = [...prev, newWeekData];
                    return updated.sort((a, b) => b.date - a.date);
                });
            }

        } catch (error) {
            console.error('Error processing files:', error);
            alert(`Error processing files: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle file drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFiles(files);
        }
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    // Handle file input
    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            processFiles(files);
        }
    };

    // Calculate week-over-week changes
    const calculateChanges = (current, previous) => {
        if (!previous) return { change: 0, percentage: 0, isNew: true };

        const change = current - previous;
        const percentage = previous === 0 ? 100 : Math.round((change / previous) * 100);

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
5. Notable patterns in booking behavior

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

    const allHostels = getAllHostels();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
                        <BarChart3 className="text-blue-600" />
                        Hostel Analytics Dashboard
                    </h1>
                    <p className="text-gray-600 text-lg">Track weekly direct bookings and analyze performance trends</p>
                </div>

                {/* Upload Section */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Upload className="text-blue-600" />
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
                                    Drop CloudBeds Excel files here
                                </p>
                                <p className="text-gray-500 mb-4">
                                    Upload multiple .xlsx files (one per hostel) to analyze weekly reservations
                                </p>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    Expected files: Flamingo.xlsx, Puerto.xlsx, Duque.xlsx, etc.
                                </div>
                            </div>
                            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                Select Files
                            </button>
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

                    {isUploading && (
                        <div className="mt-4 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Processing files...</p>
                        </div>
                    )}
                </div>

                {/* Current Week Summary */}
                {currentWeek && (
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Calendar className="text-green-600" />
                            Current Week: {currentWeek}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.entries(weeklyData[0]?.hostels || {}).map(([hostel, data]) => (
                                <div key={hostel} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                    <h3 className="font-bold text-lg text-gray-800 mb-2">{hostel}</h3>
                                    <div className="text-3xl font-bold text-green-600 mb-2">{data.count}</div>
                                    <div className="text-sm text-gray-600">Direct reservations</div>

                                    {data.bookings.length > 0 && (
                                        <div className="mt-3 text-xs text-gray-500">
                                            Avg lead time: {Math.round(
                                                data.bookings.filter(b => b.leadTime !== null)
                                                    .reduce((sum, b) => sum + b.leadTime, 0) /
                                                data.bookings.filter(b => b.leadTime !== null).length
                                            ) || 0} days
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weekly Comparison Table */}
                {weeklyData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="text-purple-600" />
                                Weekly Performance Comparison
                            </h2>
                            <button
                                onClick={getAIAnalysis}
                                disabled={isAnalyzing}
                                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Brain className="w-4 h-4" />
                                {isAnalyzing ? 'Analyzing...' : 'Get AI Analysis'}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-4 px-4 font-bold text-gray-800">Week</th>
                                        {allHostels.map(hostel => (
                                            <th key={hostel} className="text-center py-4 px-4 font-bold text-gray-800">
                                                {hostel}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyData.map((week, weekIndex) => (
                                        <tr key={week.week} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-4 px-4 font-semibold text-gray-700">
                                                {week.week}
                                            </td>
                                            {allHostels.map(hostel => {
                                                const currentCount = week.hostels[hostel]?.count || 0;
                                                const previousWeek = weeklyData[weekIndex + 1];
                                                const previousCount = previousWeek?.hostels[hostel]?.count || 0;
                                                const changes = calculateChanges(currentCount, previousCount);

                                                return (
                                                    <td key={hostel} className="py-4 px-4 text-center">
                                                        <div className="text-xl font-bold text-gray-800">
                                                            {currentCount}
                                                        </div>
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
                                                                    <span>
                                                                        {changes.change > 0 ? '+' : ''}{changes.change} ({changes.percentage}%)
                                                                    </span>
                                                                )}
                                                                {changes.change === 0 && <span>No change</span>}
                                                            </div>
                                                        )}
                                                        {changes.isNew && (
                                                            <div className="text-sm text-blue-600">New data</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* AI Analysis Report */}
                {analysisReport && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
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
                        <p className="text-gray-500">Upload your CloudBeds Excel files to start analyzing your hostel performance</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostelAnalytics;