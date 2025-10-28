import axios from 'axios';
import { message } from 'antd';

export interface UploadResponse {
  code: number;
  message: string;
  data?: {
    url: string;
    fileName: string;
    size: number;
    originalName: string;
  };
}

/**
 * 上传图片
 * @param file 图片文件(File对象或Blob)
 * @returns Promise<string> 返回图片URL
 */
export async function uploadImage(file: File | Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post<UploadResponse>('/api/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000, // 30秒超时
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`上传进度: ${percent}%`);
        }
      }
    });

    if (response.data.code === 0 && response.data.data) {
      return response.data.data.url;
    } else {
      throw new Error(response.data.message || '上传失败');
    }
  } catch (error: any) {
    console.error('图片上传失败:', error);

    let errorMessage = '图片上传失败';

    if (error.response) {
      // 服务器返回错误
      errorMessage = error.response.data?.message || `上传失败(${error.response.status})`;
    } else if (error.request) {
      // 请求发出但没有收到响应
      errorMessage = '网络错误,请检查图片上传服务是否启动';
    } else {
      // 其他错误
      errorMessage = error.message || '上传失败';
    }

    message.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * 删除图片
 * @param fileName 文件名
 */
export async function deleteImage(fileName: string): Promise<void> {
  try {
    const response = await axios.delete<UploadResponse>(`/api/upload/image/${fileName}`);

    if (response.data.code === 0) {
      message.success('图片删除成功');
    } else {
      throw new Error(response.data.message || '删除失败');
    }
  } catch (error: any) {
    console.error('图片删除失败:', error);
    message.error(error.response?.data?.message || '删除失败');
    throw error;
  }
}
