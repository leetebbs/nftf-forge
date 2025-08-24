import axios from 'axios';
import FormData from 'form-data';

/**
 * Upload a file (Buffer) to Pinata IPFS.
 * @param fileBuffer - The file data as a Buffer
 * @param options - { fileName, apiKey, apiSecret }
 * @returns Pinata response with IpfsHash
 */
export async function uploadFileToPinata(
  fileBuffer: Buffer,
  options: { fileName: string; apiKey: string; apiSecret: string }
) {
  const { fileName, apiKey, apiSecret } = options;
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

  const formData = new FormData();
  formData.append('file', fileBuffer, { filename: fileName });

  const headers = {
    ...formData.getHeaders(),
    pinata_api_key: apiKey,
    pinata_secret_api_key: apiSecret,
  };

  const response = await axios.post(url, formData, { headers });
  return response.data;
}

/**
 * Upload a JSON object to Pinata IPFS.
 * @param json - The JSON object to upload
 * @param options - { fileName, apiKey, apiSecret }
 * @returns Pinata response with IpfsHash
 */
export async function uploadJsonToPinata(
  json: any,
  options: { fileName: string; apiKey: string; apiSecret: string }
) {
  const { fileName, apiKey, apiSecret } = options;
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

  const body = {
    pinataMetadata: { name: fileName },
    pinataContent: json,
  };

  const headers = {
    'Content-Type': 'application/json',
    pinata_api_key: apiKey,
    pinata_secret_api_key: apiSecret,
  };

  const response = await axios.post(url, body, { headers });
  return response.data;
}