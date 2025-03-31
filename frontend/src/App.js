// src/App.js
import React, { useState } from 'react';
import './App.css';
import { Container, Typography, TextField, Button, Paper, CircularProgress, AppBar, Toolbar, Box, Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [summaryLength, setSummaryLength] = useState('medium');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Clear previous inputs and results when switching tabs
    setText('');
    setUrl('');
    setFile(null);
    setSummary('');
    setError('');
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSummaryLengthChange = (e) => {
    setSummaryLength(e.target.value);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setSummary('');

    try {
      const formData = new FormData();
      formData.append('summary_length', summaryLength);

      // Add content based on active tab
      if (tabValue === 0 && text) {
        formData.append('text', text);
      } else if (tabValue === 1 && url) {
        formData.append('url', url);
      } else if (tabValue === 2 && file) {
        formData.append('file', file);
      } else {
        throw new Error('Vui lòng nhập nội dung cần tóm tắt');
      }

      const response = await fetch('http://localhost:5000/api/summarize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Có lỗi xảy ra khi tóm tắt');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    if (tabValue === 0) {
      setText('');
    } else if (tabValue === 1) {
      setUrl('');
    } else if (tabValue === 2) {
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
    setSummary('');
    setError('');
  };

  return (
    <div className="App">
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Vietnamese Text Summarizer
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Công cụ Tóm tắt Văn bản Tiếng Việt
          </Typography>
          <Typography variant="body1" paragraph align="center">
            Công cụ sử dụng trí tuệ nhân tạo để tóm tắt văn bản tiếng Việt từ nhiều nguồn khác nhau.
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="input tabs">
              <Tab label="Văn bản" />
              <Tab label="Website" />
              <Tab label="Tệp tin" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <TextField
              fullWidth
              label="Nhập văn bản tiếng Việt cần tóm tắt"
              multiline
              rows={6}
              variant="outlined"
              value={text}
              onChange={handleTextChange}
              disabled={isLoading}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <TextField
              fullWidth
              label="Nhập URL trang web tiếng Việt"
              variant="outlined"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com/article"
              disabled={isLoading}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 2, border: '1px dashed grey', borderRadius: 1, textAlign: 'center' }}>
              <input
                accept=".txt,.docx,.doc,.pdf"
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <label htmlFor="file-upload">
                <Button variant="contained" component="span" disabled={isLoading}>
                  Chọn tệp tin
                </Button>
              </label>
              {file && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Đã chọn: {file.name}
                </Typography>
              )}
            </Box>
          </TabPanel>

          <Box sx={{ mt: 3, mb: 2 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Độ dài tóm tắt</InputLabel>
              <Select
                value={summaryLength}
                onChange={handleSummaryLengthChange}
                label="Độ dài tóm tắt"
                disabled={isLoading}
              >
                <MenuItem value="short">Ngắn</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="long">Chi tiết</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={clearAll}
              disabled={isLoading}
            >
              Xóa tất cả
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isLoading || (tabValue === 0 && !text) || (tabValue === 1 && !url) || (tabValue === 2 && !file)}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Tóm tắt'}
            </Button>
          </Box>
        </Paper>

        {error && (
          <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: '#fdeded' }}>
            <Typography color="error" variant="subtitle2">
              Lỗi: {error}
            </Typography>
          </Paper>
        )}

        {summary && (
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Bản tóm tắt
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
                {summary}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(summary);
                }}
              >
                Sao chép
              </Button>
            </Box>
          </Paper>
        )}
      </Container>
    </div>
  );
}

export default App;