import Alpine from 'alpinejs';
import persist from '@alpinejs/persist';
import {studioV3} from './ui/studio-v3.js';
import './style.css';
Alpine.plugin(persist);
Alpine.data('studio',studioV3);
window.Alpine=Alpine;
Alpine.start();
