'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ImportReport } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, AlertCircle, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

export default function ImportPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const importMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await api.post('/imports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: (data: ImportReport) => {
      toast.success('Import processed successfully');
      setReport(data);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Import failed');
    }
  });

  if (user?.role !== 'manager') {
    return <div>Unauthorized</div>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setReport(null);
    }
  };

  const handleUpload = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Import Shifts</h1>
        <p className="text-gray-500">Upload a CSV file to bulk create shifts and assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Upload Shifts CSV
            </CardTitle>
            <CardDescription>
              Format: Date, Start Time, End Time, Role, Count
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {file ? file.name : "Click or drag shifts file"}
              </p>
              {!file && <p className="text-xs text-gray-500 mt-1">.csv format only</p>}
            </div>

            <Button 
              className="w-full" 
              onClick={handleUpload}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                "Import Shifts"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Import Results</CardTitle>
            <CardDescription>
              Summary of the imported rows and any errors encountered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!report && !importMutation.isPending && (
              <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
                <p>Upload a CSV file to see results here</p>
              </div>
            )}
            
            {importMutation.isPending && (
              <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
                <p>Processing your file...</p>
              </div>
            )}

            {report && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <div className="text-3xl font-bold text-emerald-600">{report.accepted_count}</div>
                    <div className="text-sm font-medium text-emerald-800 mt-1">Accepted</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <div className="text-3xl font-bold text-amber-600">{report.merged_count}</div>
                    <div className="text-sm font-medium text-amber-800 mt-1">Merged</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <div className="text-3xl font-bold text-red-600">{report.rejected_count}</div>
                    <div className="text-sm font-medium text-red-800 mt-1">Rejected</div>
                  </div>
                </div>

                {report.errors.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-16 text-center">Row</TableHead>
                          <TableHead>Problem</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.errors.map((err) => (
                          <TableRow key={err.id}>
                            <TableCell className="text-center font-medium">
                              {err.row_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {err.problem}
                            </TableCell>
                            <TableCell>
                              <Badge variant={err.action_taken === 'Rejected' ? 'destructive' : 'secondary'}>
                                {err.action_taken}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-6 h-6 mr-2" />
                    <span className="font-medium">All rows imported successfully without errors!</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
