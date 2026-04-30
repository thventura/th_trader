"use client";

import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface ActivityData {
    label: string;
    value: number; // percentage (0-100)
    color: string;
    size: number;
    current: string | number;
    target: string | number;
    unit: string;
}

interface CircleProgressProps {
    data: ActivityData;
    index: number;
    key?: string;
}

const CircleProgress = ({ data, index }: CircleProgressProps) => {
    const strokeWidth = 14;
    const radius = (data.size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = ((100 - Math.min(100, Math.max(0, data.value))) / 100) * circumference;

    const gradientId = `gradient-${data.label.toLowerCase().replace(/\s+/g, '-')}-${index}`;
    const gradientUrl = `url(#${gradientId})`;

    return (
        <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: index * 0.15, ease: "easeOut" }}
        >
            <div className="relative">
                <svg
                    width={data.size}
                    height={data.size}
                    viewBox={`0 0 ${data.size} ${data.size}`}
                    className="transform -rotate-90"
                    aria-label={`${data.label} Progress - ${data.value}%`}
                >
                    <title>{`${data.label} Progress - ${data.value}%`}</title>

                    <defs>
                        <linearGradient
                            id={gradientId}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                style={{
                                    stopColor: data.color,
                                    stopOpacity: 1,
                                }}
                            />
                            <stop
                                offset="100%"
                                style={{
                                    stopColor: data.color, // Can be adjusted for a real gradient effect if needed
                                    stopOpacity: 0.7,
                                }}
                            />
                        </linearGradient>
                    </defs>

                    <circle
                        cx={data.size / 2}
                        cy={data.size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-white/5 dark:text-white/5"
                    />

                    <motion.circle
                        cx={data.size / 2}
                        cy={data.size / 2}
                        r={radius}
                        fill="none"
                        stroke={gradientUrl}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: progress }}
                        transition={{
                            duration: 1.5,
                            delay: index * 0.15,
                            ease: "easeInOut",
                        }}
                        strokeLinecap="round"
                        style={{
                            filter: "drop-shadow(0 0 4px rgba(0,0,0,0.3))",
                        }}
                    />
                </svg>
            </div>
        </motion.div>
    );
};

export function AppleActivityCard({
    title,
    activities,
    className,
}: {
    title?: string;
    activities: ActivityData[];
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative w-full max-w-3xl mx-auto p-4 md:p-8 rounded-3xl overflow-hidden",
                "text-white",
                className
            )}
        >
            <div className="flex flex-col items-center gap-6">
                {title && (
                    <motion.h2
                        className="text-lg font-bold text-slate-400 uppercase tracking-widest"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {title}
                    </motion.h2>
                )}

                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                        {activities.map((activity, index) => (
                            <CircleProgress
                                key={activity.label}
                                data={activity}
                                index={index}
                            />
                        ))}
                    </div>
                    
                    <div className="flex flex-col gap-4">
                        {activities.map((activity, index) => (
                            <motion.div 
                                key={activity.label} 
                                className="flex flex-col"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                            >
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {activity.label}
                                </span>
                                <span
                                    className="text-xl font-black flex items-baseline gap-1"
                                    style={{ color: activity.color }}
                                >
                                    {activity.current}
                                    <span className="text-xs font-bold text-slate-500">
                                        / {activity.target} {activity.unit}
                                    </span>
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
