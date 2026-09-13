import type { DatasetDetail, DatasetSummary } from "../types";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
    throw new Error("VITE_API_URL is not configured");
}

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, options)

    if(!response.ok) {
        let message = `Request failed with status ${response.status}`;

        try {
            const body = await response.json();

            if(typeof body.detail === "string") {
                message = body.detail;
            } else if (Array.isArray(body.detail)) {
                message = body.detail
                    .map((error: {msg?: string}) => error.msg ?? "Validation error")
                    .join(", ");
            }
        } catch {
            // Response wasn't JSON; keep the fallback message
        }

        throw new Error(message);
    }

    // DELETE returns 204 no Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export async function listDatasets(): Promise<DatasetSummary[]> {
    return request<DatasetSummary[]>("/api/datasets");
}

export async function getDataset(id: string): Promise<DatasetDetail> {
    return request<DatasetDetail>(`/api/datasets/${id}`);
}

export async function uploadCsv(file: File): Promise<DatasetDetail> {
    const formData = new FormData();
    formData.append("file", file);

    return request<DatasetDetail>("/api/datasets/upload", {
        method: "POST",
        body: formData,
    });
}

export async function loadSample(): Promise<DatasetDetail> {
    return request<DatasetDetail>("/api/datasets/sample", {
        method: "POST",
    });
}

export async function deleteDataset(id: string): Promise<void> {
    return request<void>(`/api/datasets/${id}`, {
        method: "DELETE",
    });
}