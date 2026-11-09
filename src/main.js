import Alpine from 'alpinejs';
import persist from '@alpinejs/persist';
import {studioV4} from './ui/studio-v4.js';
import './style.css';
Alpine.plugin(persist);
Alpine.data('studio',studioV4);
window.Alpine=Alpine;
Alpine.start();
