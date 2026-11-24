'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

gsap.registerPlugin(ScrollTrigger);

/** One scroll choreography. Different gestures per section, never scroll hijacking. */
export default function JourneyMotion() {
  useEffect(() => {
    let context: gsap.Context | undefined;
    function setup() {
      context?.revert();
      context = undefined;
      if (prefereMenosMovimento()) return;
      const radius = document.documentElement.dataset.palette === 'fiap' ? '0px' : '16px';
      context = gsap.context(() => {
        // The entrance photo drifts behind the *same* persistent WebGL landscape.
        // No separate hero scene, no pinned scroll and no abrupt opacity cut.
        const entrancePhoto = document.querySelector('.entrance-backdrop');
        if (entrancePhoto) {
          gsap.fromTo(
            entrancePhoto,
            { scale: 1, yPercent: 0 },
            {
              scale: 1.075,
              yPercent: 4,
              ease: 'none',
              scrollTrigger: {
                trigger: '#inicio',
                start: 'top top',
                end: 'bottom top',
                scrub: 1.4,
              },
            }
          );
        }
        const photo = document.querySelector('#sobre .img-editorial img');
        if (photo && document.documentElement.dataset.palette !== 'fiap') {
          gsap.fromTo(
            photo,
            { scale: 1.14, xPercent: -3 },
            {
              scale: 1,
              xPercent: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: '#sobre',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.1,
              },
            }
          );
        }
        const campus = document.querySelector('#campus .campus-plan');
        if (campus) {
          gsap.fromTo(
            campus,
            { rotateX: 4, y: 24 },
            {
              rotateX: -2,
              y: -12,
              ease: 'none',
              scrollTrigger: {
                trigger: '#campus',
                start: 'top 95%',
                end: 'bottom 20%',
                scrub: 1.3,
              },
            }
          );
        }
        gsap.utils.toArray<HTMLElement>('#areas li[data-reveal]').forEach((row, i) => {
          const picture = row.querySelector('.img-editorial');
          if (!picture) return;
          gsap.fromTo(
            picture,
            { clipPath: `inset(${i % 2 ? 14 : 8}% 0 9% 0 round ${radius})` },
            {
              clipPath: `inset(0% 0% 0% 0% round ${radius})`,
              duration: 0.85,
              ease: 'power2.out',
              scrollTrigger: { trigger: row, start: 'top 90%', once: true },
            }
          );
        });
        // Distinct editorial beats. Avoid moving interactive hit targets or changing layout.
        const campusGallery = document.querySelector('.campus-gallery');
        if (campusGallery) {
          gsap.fromTo(
            campusGallery,
            { y: 12 },
            {
              y: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: campusGallery,
                start: 'top bottom',
                end: 'center 55%',
                scrub: 1.1,
              },
            }
          );
        }
      });
    }
    setup();
    const stop = ouvirMudancaMovimento(setup);
    window.addEventListener('pandora:palette', setup);
    return () => {
      stop();
      window.removeEventListener('pandora:palette', setup);
      context?.revert();
    };
  }, []);
  return null;
}
