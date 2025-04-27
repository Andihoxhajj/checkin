import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function Reports() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [timeReport, setTimeReport] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/workers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setWorkers(response.data.workers);
      } else {
        setError(response.data.message || 'Failed to fetch workers');
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      setError(err.response?.data?.message || 'Failed to fetch workers');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerTimeReport = async (workerId) => {
    try {
      const token = localStorage.getItem('token');
      const [summaryResponse, detailedResponse] = await Promise.all([
        axios.get(`http://localhost:5000/api/attendance/summary/${workerId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get(`http://localhost:5000/api/attendance/detailed/${workerId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (summaryResponse.data.success && detailedResponse.data.success) {
        setTimeReport(summaryResponse.data.data);
        setDetailedReport(detailedResponse.data.data);
      } else {
        setError('Failed to fetch time reports');
      }
    } catch (err) {
      console.error('Error fetching time reports:', err);
      setError(err.response?.data?.message || 'Failed to fetch time reports');
    }
  };

  const handleWorkerClick = (worker) => {
    setSelectedWorker(worker);
    fetchWorkerTimeReport(worker.id);
  };

  const handleBack = () => {
    navigate('/admin');
  };

  const exportAllWorkersData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get all workers with their time data
      const workersData = await Promise.all(workers.map(async (worker) => {
        const [summaryResponse, detailedResponse] = await Promise.all([
          axios.get(`http://localhost:5000/api/attendance/summary/${worker.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          axios.get(`http://localhost:5000/api/attendance/detailed/${worker.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);
        
        if (summaryResponse.data.success && detailedResponse.data.success) {
          return {
            worker,
            summary: summaryResponse.data.data,
            detailed: detailedResponse.data.data
          };
        }
        return null;
      }));
      
      // Filter out any failed requests
      const validWorkersData = workersData.filter(data => data !== null);
      
      // Group workers by department
      const departmentGroups = {};
      validWorkersData.forEach(data => {
        const dept = data.worker.department || 'No Department';
        if (!departmentGroups[dept]) {
          departmentGroups[dept] = [];
        }
        departmentGroups[dept].push(data);
      });
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Create summary worksheet with all workers
      const summaryData = validWorkersData.map(data => ({
        Name: data.worker.name,
        Position: data.worker.position,
        Department: data.worker.department,
        'Total Days': data.summary.total_days,
        'Completed Days': data.summary.completed_days,
        'Total Hours': data.summary.total_hours ? data.summary.total_hours.toFixed(2) : "0.00",
        'First Check-in': new Date(data.summary.first_check_in).toLocaleDateString()
      }));
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "All Workers Summary");
      
      // Create a worksheet for each department
      Object.keys(departmentGroups).forEach(dept => {
        const deptData = departmentGroups[dept].map(data => ({
          Name: data.worker.name,
          Position: data.worker.position,
          'Total Days': data.summary.total_days,
          'Completed Days': data.summary.completed_days,
          'Total Hours': data.summary.total_hours ? data.summary.total_hours.toFixed(2) : "0.00",
          'First Check-in': new Date(data.summary.first_check_in).toLocaleDateString()
        }));
        
        const deptWorksheet = XLSX.utils.json_to_sheet(deptData);
        XLSX.utils.book_append_sheet(workbook, deptWorksheet, dept.substring(0, 30)); // Excel sheet names limited to 31 chars
      });
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save file
      saveAs(blob, `All_Workers_Time_Report_${new Date().toLocaleDateString()}.xlsx`);
    } catch (err) {
      console.error('Error exporting all workers data:', err);
      setError(err.response?.data?.message || 'Failed to export all workers data');
    }
  };

  const exportWorkerData = async (worker, e) => {
    e.stopPropagation(); // Prevent card click event from firing
    
    try {
      const token = localStorage.getItem('token');
      const [summaryResponse, detailedResponse] = await Promise.all([
        axios.get(`http://localhost:5000/api/attendance/summary/${worker.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        axios.get(`http://localhost:5000/api/attendance/detailed/${worker.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (summaryResponse.data.success && detailedResponse.data.success) {
        const timeData = summaryResponse.data.data;
        const detailData = detailedResponse.data.data;
        
        // Create workbook and worksheets
        const workbook = XLSX.utils.book_new();
        
        // Daily worksheet
        const dailyData = detailData.daily.map(day => ({
          Date: new Date(day.date).toLocaleDateString(),
          Hours: day.total_hours.toFixed(2)
        }));
        const dailyWorksheet = XLSX.utils.json_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(workbook, dailyWorksheet, "Daily Hours");
        
        // Monthly worksheet
        const monthlyData = detailData.monthly.map(month => ({
          Month: new Date(month.year, month.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' }),
          Hours: month.total_hours.toFixed(2)
        }));
        const monthlyWorksheet = XLSX.utils.json_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(workbook, monthlyWorksheet, "Monthly Hours");
        
        // Yearly worksheet
        const yearlyData = detailData.yearly.map(year => ({
          Year: year.year.toString(),
          Hours: year.total_hours.toFixed(2)
        }));
        const yearlyWorksheet = XLSX.utils.json_to_sheet(yearlyData);
        XLSX.utils.book_append_sheet(workbook, yearlyWorksheet, "Yearly Hours");
        
        // Summary worksheet
        const summaryData = [{
          "Total Days": timeData.total_days,
          "Completed Days": timeData.completed_days,
          "First Check-in": new Date(timeData.first_check_in).toLocaleDateString(),
          "Total Hours": timeData.total_hours ? timeData.total_hours.toFixed(2) : "0.00"
        }];
        const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
        
        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Save file
        saveAs(blob, `${worker.name}_time_report.xlsx`);
      } else {
        setError('Failed to export time reports');
      }
    } catch (err) {
      console.error('Error exporting time reports:', err);
      setError(err.response?.data?.message || 'Failed to export time reports');
    }
  };

  const exportToExcel = () => {
    if (!selectedWorker || !detailedReport) return;

    // Create workbook and worksheets
    const workbook = XLSX.utils.book_new();
    
    // Daily worksheet
    const dailyData = detailedReport.daily.map(day => ({
      Date: new Date(day.date).toLocaleDateString(),
      Hours: day.total_hours.toFixed(2)
    }));
    const dailyWorksheet = XLSX.utils.json_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(workbook, dailyWorksheet, "Daily Hours");
    
    // Monthly worksheet
    const monthlyData = detailedReport.monthly.map(month => ({
      Month: new Date(month.year, month.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' }),
      Hours: month.total_hours.toFixed(2)
    }));
    const monthlyWorksheet = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(workbook, monthlyWorksheet, "Monthly Hours");
    
    // Yearly worksheet
    const yearlyData = detailedReport.yearly.map(year => ({
      Year: year.year.toString(),
      Hours: year.total_hours.toFixed(2)
    }));
    const yearlyWorksheet = XLSX.utils.json_to_sheet(yearlyData);
    XLSX.utils.book_append_sheet(workbook, yearlyWorksheet, "Yearly Hours");
    
    // Summary worksheet
    const summaryData = [{
      "Total Days": timeReport.total_days,
      "Completed Days": timeReport.completed_days,
      "First Check-in": new Date(timeReport.first_check_in).toLocaleDateString(),
      "Total Hours": timeReport.total_hours ? timeReport.total_hours.toFixed(2) : "0.00"
    }];
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Save file
    saveAs(blob, `${selectedWorker.name}_time_report.xlsx`);
  };

  if (!user || user.role !== 'admin') {
    return <div>Unauthorized access</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-red-600 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Time Reports</h2>
                <p className="text-red-100 mt-1">Welcome, {user.name}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportAllWorkersData}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export All
                </button>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map((worker) => (
                <motion.div
                  key={worker.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleWorkerClick(worker)}
                  className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer border-2 ${
                    selectedWorker?.id === worker.id ? 'border-red-500' : 'border-transparent'
                  }`}
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800">{worker.name}</h3>
                    <p className="text-gray-600">{worker.position}</p>
                    <p className="text-gray-500 text-sm">{worker.department}</p>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={(e) => exportWorkerData(worker, e)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Export
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {selectedWorker && timeReport && detailedReport && (
              <div className="mt-8 space-y-8">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Summary for {selectedWorker.name}
                    </h3>
                    <button
                      onClick={exportToExcel}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Export to Excel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500">Total Days</h4>
                      <p className="text-2xl font-semibold text-gray-800">{timeReport.total_days}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500">Completed Days</h4>
                      <p className="text-2xl font-semibold text-gray-800">{timeReport.completed_days}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500">First Check-in</h4>
                      <p className="text-lg font-semibold text-gray-800">
                        {new Date(timeReport.first_check_in).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Hours</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailedReport.daily.map((day) => (
                          <tr key={day.date}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(day.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {day.total_hours.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Monthly Hours</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailedReport.monthly.map((month) => (
                          <tr key={`${month.year}-${month.month}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(month.year, month.month - 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {month.total_hours.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Yearly Hours</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailedReport.yearly.map((year) => (
                          <tr key={year.year}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {year.year}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {year.total_hours.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports; 