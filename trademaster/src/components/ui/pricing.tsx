'use client';
import React from 'react';
import { Button } from '@/src/components/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { cn } from '@/src/lib/utils';
import { CheckCircleIcon, StarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, Transition } from 'framer-motion';

type FREQUENCY = 'monthly' | 'yearly';
const frequencies: FREQUENCY[] = ['monthly', 'yearly'];

export interface Plan {
	name: string;
	info: string;
	price: {
		monthly: number;
		yearly: number;
	};
	features: {
		text: string;
		tooltip?: string;
	}[];
	btn: {
		text: string;
		href: string;
	};
	highlighted?: boolean;
}

interface PricingSectionProps extends React.ComponentProps<'div'> {
	plans: Plan[];
	heading: string;
	description?: string;
	className?: string;
}

export function PricingSection({
	plans,
	heading,
	description,
	className,
	...props
}: PricingSectionProps) {
	const [frequency, setFrequency] = React.useState<'monthly' | 'yearly'>(
		'monthly',
	);

	return (
		<div
			className={cn(
				'flex w-full flex-col items-center justify-center space-y-5 p-4',
				className,
			)}
			{...props}
		>
			<div className="mx-auto max-w-xl space-y-2">
				<h2 className="text-center text-4xl font-black tracking-tight md:text-5xl uppercase italic text-apex-trader-primary">
					{heading}
				</h2>
				{description && (
					<p className="text-slate-400 text-center text-sm md:text-base font-medium">
						{description}
					</p>
				)}
			</div>
			
			<div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-1 place-items-center">
				{plans.map((plan) => (
					<PricingCard plan={plan} key={plan.name} frequency={frequency} className="max-w-md" />
				))}
			</div>
		</div>
	);
}

type PricingFrequencyToggleProps = React.ComponentProps<'div'> & {
	frequency: FREQUENCY;
	setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
};

export function PricingFrequencyToggle({
	frequency,
	setFrequency,
	...props
}: PricingFrequencyToggleProps) {
	return (
		<div
			className={cn(
				'bg-white/5 mx-auto flex w-fit rounded-full border border-white/10 p-1',
				props.className,
			)}
			{...props}
		>
			{frequencies.map((freq) => (
				<button
					key={freq}
					onClick={() => setFrequency(freq)}
					className="relative px-6 py-2 text-sm capitalize font-black tracking-widest transition-colors hover:text-white"
				>
					<span className="relative z-10 uppercase">{freq === 'monthly' ? 'Mensal' : 'Anual'}</span>
					{frequency === freq && (
						<motion.span
							layoutId="frequency"
							transition={{ type: 'spring', duration: 0.4 }}
							className="bg-apex-trader-primary absolute inset-0 z-0 rounded-full"
						/>
					)}
				</button>
			))}
		</div>
	);
}

type PricingCardProps = React.ComponentProps<'div'> & {
	plan: Plan;
	frequency?: FREQUENCY;
};

export function PricingCard({
	plan,
	className,
	frequency = frequencies[0],
	...props
}: PricingCardProps) {
	return (
		<div
			key={plan.name}
			className={cn(
				'relative flex w-full flex-col rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl',
				plan.highlighted && 'border-primary/50',
				className,
			)}
			{...props}
		>
			{plan.highlighted && (
				<BorderTrail
					style={{
						boxShadow:
							'0px 0px 60px 10px rgba(59, 130, 246, 0.5)',
					}}
					size={120}
					className="bg-apex-trader-primary"
				/>
			)}
			<div
				className={cn(
					'bg-white/5 border-b border-white/5 p-8',
					plan.highlighted && 'bg-primary/5',
				)}
			>
				<div className="absolute top-4 right-4 z-10 flex items-center gap-2">
					{plan.highlighted && (
						<p className="bg-apex-trader-primary text-black flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.3)]">
							<StarIcon className="h-3 w-3 fill-current" />
							Popular
						</p>
					)}
				</div>

				<div className="text-xl font-black uppercase tracking-tighter text-white italic">{plan.name}</div>
				<p className="text-slate-400 text-sm font-medium mt-1">{plan.info}</p>
				<h3 className="mt-6 flex items-end gap-2 text-white">
					<span className="text-5xl font-black tracking-tighter">R$ {plan.price[frequency]}</span>
					<span className="text-slate-500 font-bold mb-1 italic opacity-60">
						{plan.name !== 'Free'
							? '/' + (frequency === 'monthly' ? 'mês' : 'ano')
							: ''}
					</span>
				</h3>
			</div>
			
			<div
				className={cn(
					'text-slate-300 space-y-4 px-8 py-8 text-sm',
					plan.highlighted && 'bg-primary/2',
				)}
			>
				{plan.features.map((feature, index) => (
					<div key={index} className="flex items-center gap-3">
						<div className="w-5 h-5 rounded-full bg-apex-trader-primary/20 flex items-center justify-center shrink-0">
							<CheckCircleIcon className="text-apex-trader-primary h-3.5 w-3.5" />
						</div>
						<TooltipProvider>
							<Tooltip delayDuration={0}>
								<TooltipTrigger asChild>
									<p
										className={cn(
											"font-bold uppercase tracking-tight text-[13px]",
											feature.tooltip &&
												'cursor-pointer border-b border-dashed border-white/20',
										)}
									>
										{feature.text}
									</p>
								</TooltipTrigger>
								{feature.tooltip && (
									<TooltipContent className="bg-slate-900 border-white/10 text-white font-bold p-3">
										<p>{feature.tooltip}</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</div>
				))}
			</div>
			
			<div
				className={cn(
					'mt-auto w-full border-t border-white/5 p-6',
					plan.highlighted && 'bg-apex-trader-primary/5',
				)}
			>
				<Button
					className={cn(
						"w-full py-7 rounded-2xl font-black text-lg uppercase italic tracking-tighter transition-all",
						plan.highlighted 
							? "bg-apex-trader-primary text-black hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]" 
							: "bg-white/5 text-white hover:bg-white/10 border border-white/10"
					)}
					asChild
				>
					<a href={plan.btn.href} target="_blank" rel="noopener noreferrer">{plan.btn.text}</a>
				</Button>
			</div>
		</div>
	);
}


type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 5,
    ease: 'linear',
  };

  return (
    <div className='pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]'>
      <motion.div
        className={cn('absolute aspect-square bg-zinc-500', className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
