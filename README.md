# React CloudBeds Bookings Analytics

A powerful analytics dashboard for hostel chains to track weekly direct booking performance, analyze conversion trends, and gain AI-powered insights from CloudBeds reservation data.

## 🏨 Overview

This React-based dashboard transforms your CloudBeds reservation exports into actionable insights, helping hostel operators understand booking patterns, track week-over-week performance, and identify growth opportunities across their property portfolio.

## ✨ Features

### 📊 **Multi-Format Data Input**
- **Excel File Upload**: Drag & drop CloudBeds .xlsx exports
- **Copy & Paste**: Lightning-fast data entry from CloudBeds web interface
- **Auto-Detection**: Automatically identifies hostels by name or CloudBeds property ID
- **Multi-Hostel Support**: Handle multiple properties simultaneously

### 📈 **Comprehensive Analytics**
- **Week-over-Week Comparisons**: Track reservation trends with percentage changes
- **Average Daily Rate (ADR)**: Calculate and monitor pricing performance
- **Lead Time Analysis**: Understand booking advance patterns
- **Cancellation Tracking**: Monitor cancellation rates as conversion metrics

### 📱 **Modern Dashboard**
- **Responsive Design**: Optimized for desktop (4 columns) and mobile (2 columns)
- **Interactive Charts**: Toggle between line and bar charts
- **Real-Time Updates**: Instant calculations and trend analysis
- **Clean Table View**: Hostels as rows, weeks as columns with totals

### 🤖 **AI-Powered Insights**
- **Trend Analysis**: Understand why performance changes week to week
- **Pattern Recognition**: Identify seasonal and booking behavior patterns
- **Actionable Recommendations**: Get specific suggestions for improvement

## 🚀 Quick Start

### Prerequisites
- Node.js (latest stable version recommended)
- npm package manager
- CloudBeds account with reservation export access

### Installation

```bash
# Clone the repository
git clone https://github.com/arturmamedov1993/react-cloudbeds-bookings-analytics.git

# Navigate to project directory
cd react-cloudbeds-bookings-analytics

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 📋 Usage Guide

### Method 1: File Upload
1. **Export from CloudBeds**: Go to Reports → Reservations → Export as Excel
2. **Filter for Direct Bookings**: Ensure "Sitio web o motor de reservas" source is selected
3. **Upload Files**: Drag and drop .xlsx files (one per hostel) into the dashboard
4. **Analyze**: View instant analytics and trends

### Method 2: Copy & Paste (Fastest)
1. **In CloudBeds**: Navigate to your reservations table
2. **Select & Copy**: Select table data and copy (Ctrl+C/Cmd+C)
3. **In Dashboard**: Switch to "Copy & Paste" mode
4. **Paste Data**: Paste into the text area (supports HTML or plain text)
5. **Process**: Click "Process Data" for instant analysis

### Supported Data Sources
- **CloudBeds Reservation Reports**: Direct booking data with full reservation details
- **Required Fields**: Booking date, check-in, check-out, nights, price, status, source
- **Auto-Detection**: Works with hostel names (Flamingo, Puerto, Duque) or CloudBeds property IDs

## 🏗️ Technical Stack

### Core Technologies
- **React 18**: Modern UI framework with hooks
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Interactive charts and visualizations
- **SheetJS (XLSX)**: Excel file processing
- **Lucide React**: Modern icon library

### Key Dependencies
- **Math Operations**: Automatic ADR and lead time calculations
- **Date Processing**: Excel date parsing and week range generation
- **AI Integration**: Claude API for intelligent analysis
- **Responsive Design**: Mobile-first responsive grid system

### Browser Compatibility
- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge (latest versions)

## 📊 Data Processing

### Metrics Calculated
- **Total Reservations**: All bookings including cancellations (conversion tracking)
- **Valid Reservations**: Confirmed and checked-out bookings
- **Cancellation Rate**: Percentage of cancelled vs total bookings
- **Average Daily Rate (ADR)**: Total revenue ÷ total nights (excluding cancellations)
- **Average Lead Time**: Days between booking and check-in dates

### Data Filtering
- **Source Filter**: Only "Sitio web o motor de reservas" (direct bookings)
- **Status Tracking**: Separates confirmed, checked-out, and cancelled reservations
- **Week Grouping**: Groups reservations by booking date ranges

## 🔧 Development

### Available Scripts
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Project Structure
```
src/
├── components/          # React components
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── styles/             # CSS and styling
└── types/              # TypeScript definitions
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```
This creates an optimized build in the `dist/` directory ready for deployment.

### Deployment Options
- **Netlify**: Connect your GitHub repository for automatic deployments
- **Vercel**: Perfect for React applications with zero configuration
- **Static Hosting**: Deploy the `dist/` folder to any static hosting service

## 🤝 Contributing

This project is primarily designed for internal use at hostel chains but welcomes contributions from hospitality tech enthusiasts.

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Test with real CloudBeds data when possible
- Ensure mobile responsiveness
- Update documentation for new features

## 📈 Roadmap

### Planned Features
- **Advanced Cancellation Analytics**: Detailed cancellation reason tracking
- **Revenue Forecasting**: Predictive analytics for future performance
- **Multi-Language Support**: Spanish and other language interfaces
- **API Integrations**: Direct CloudBeds API connectivity
- **Custom Date Ranges**: Flexible reporting periods beyond weekly

### Performance Optimizations
- **Data Caching**: Store processed data for faster subsequent loads
- **Chart Performance**: Optimize rendering for large datasets
- **Mobile UX**: Enhanced mobile interface and gestures

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Author

**Artur Mamedov** - [arturmamedov1993@gmail.com](mailto:arturmamedov1993@gmail.com)

## 🙏 Acknowledgments

- Built for hostel chain operators who need actionable booking insights
- Inspired by the need for fast, reliable CloudBeds data analysis
- Thanks to the React and open-source community for excellent libraries

## 📞 Support

For questions, issues, or feature requests:
- **Email**: arturmamedov1993@gmail.com
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **CloudBeds Integration**: Ensure your data exports include all required fields

---

*Transform your CloudBeds data into actionable insights. Track performance, understand trends, and grow your hostel business with data-driven decisions.*