/**
 * Spectral-centroid adapter for MusicMenker Spatial Sound Effects.
 * The transform comes from the MIT-licensed fourier-transform library.
 * This measurement covers only the first frame (matching v0.0.2.0 behavior).
 */
import rfft from 'fourier-transform';

export const CENTROID_FRAME_SIZE=2048;

/**
 * Calculate the magnitude-weighted spectral centroid in Hz.
 * @param {Float32Array|Float64Array|number[]} samples - Mono PCM data.
 * @param {number} sampleRate - Input PCM sample rate in Hz.
 * @returns {number|null} Hz; null on silence, short or invalid input.
 */
export function spectralCentroidHz(samples,sampleRate){
  const n=CENTROID_FRAME_SIZE;
  if(!samples||samples.length<n||!Number.isFinite(sampleRate)||sampleRate<=0)return null;

  const frame=new Float64Array(n);
  // Periodic Hann window, suited to measuring an FFT frame.
  for(let i=0;i<n;i++){
    const value=samples[i];
    if(!Number.isFinite(value))return null;
    frame[i]=value*(0.5-0.5*Math.cos(2*Math.PI*i/n));
  }

  const spectrum=rfft(frame); // magnitude spectrum: bins 0 ... n/2-1
  let weighted=0,total=0;
  for(let bin=1;bin<spectrum.length;bin++){
    const magnitude=spectrum[bin];
    if(!Number.isFinite(magnitude)||magnitude<0)return null;
    weighted+=bin*magnitude;
    total+=magnitude;
  }
  if(total<=1e-12)return null;
  return weighted/total*(sampleRate/n);
}
